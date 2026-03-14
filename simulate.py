#!/usr/bin/env python3
"""
ActiveMQ Dashboard Test Data Simulator

Creates realistic queues, messages, DLQs, and TCQs to exercise all
dashboard views. Run against a local ActiveMQ instance.

Usage:
    python3 simulate.py [--url http://localhost:8161] [--user admin] [--password admin]
"""

import argparse
import base64
import json
import random
import string
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(description="ActiveMQ dashboard data simulator")
parser.add_argument("--url", default="http://localhost:8161")
parser.add_argument("--user", default="admin")
parser.add_argument("--password", default="admin")
parser.add_argument("--broker", default="localhost")
args = parser.parse_args()

BASE_URL   = args.url.rstrip("/")
USER       = args.user
PASSWORD   = args.password
BROKER     = args.broker

# ---------------------------------------------------------------------------
# Jolokia helpers
# ---------------------------------------------------------------------------

def _auth_header():
    creds = base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
    return {"Authorization": f"Basic {creds}", "Origin": BASE_URL}

def jolokia_post(body: dict, retries: int = 3) -> dict:
    url  = f"{BASE_URL}/api/jolokia"
    data = json.dumps(body).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=data,
                headers={**_auth_header(), "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"  [HTTP {e.code}] {e.read().decode()[:200]}", file=sys.stderr)
            return {}
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)   # 1s, 2s back-off
            else:
                print(f"  [ERROR] {e}", file=sys.stderr)
    return {}

def queue_mbean(name: str) -> str:
    return (
        f"org.apache.activemq:type=Broker,brokerName={BROKER},"
        f"destinationType=Queue,destinationName={name}"
    )

def send(queue: str, body: str) -> bool:
    # JMSDeliveryMode 2 = PERSISTENT — messages survive restarts and count
    # toward StorePercentUsage.
    resp = jolokia_post({
        "type": "exec",
        "mbean": queue_mbean(queue),
        "operation": "sendTextMessage(java.util.Map,java.lang.String)",
        "arguments": [{"JMSDeliveryMode": "2"}, body],
    })
    return resp.get("status") == 200

def create_queue(name: str) -> bool:
    resp = jolokia_post({
        "type": "exec",
        "mbean": f"org.apache.activemq:type=Broker,brokerName={BROKER}",
        "operation": "addQueue(java.lang.String)",
        "arguments": [name],
    })
    return resp.get("status") == 200

def purge(queue: str) -> bool:
    resp = jolokia_post({
        "type": "exec",
        "mbean": queue_mbean(queue),
        "operation": "purge()",
        "arguments": [],
    })
    return resp.get("status") == 200

# ---------------------------------------------------------------------------
# Message body factories
# ---------------------------------------------------------------------------

def order_msg(order_id: str = None, status: str = "NEW") -> str:
    oid = order_id or f"ORD-{random.randint(10000, 99999)}"
    return json.dumps({
        "orderId":   oid,
        "status":    status,
        "customerId": f"CUST-{random.randint(1000, 9999)}",
        "items": [
            {"sku": f"SKU-{random.randint(100,999)}", "qty": random.randint(1, 5),
             "price": round(random.uniform(9.99, 299.99), 2)}
            for _ in range(random.randint(1, 4))
        ],
        "total":     round(random.uniform(10, 1200), 2),
        "currency":  random.choice(["EUR", "USD", "GBP"]),
        "createdAt": (datetime.utcnow() - timedelta(minutes=random.randint(0, 120)))
                     .isoformat() + "Z",
    })

def payment_msg(ref: str = None) -> str:
    return json.dumps({
        "paymentRef":  ref or f"PAY-{random.randint(100000, 999999)}",
        "orderId":     f"ORD-{random.randint(10000, 99999)}",
        "amount":      round(random.uniform(10, 1200), 2),
        "currency":    random.choice(["EUR", "USD", "GBP"]),
        "method":      random.choice(["CREDIT_CARD", "PAYPAL", "BANK_TRANSFER", "CRYPTO"]),
        "provider":    random.choice(["Stripe", "Adyen", "Braintree"]),
        "status":      random.choice(["PENDING", "PROCESSING"]),
        "createdAt":   (datetime.utcnow() - timedelta(minutes=random.randint(0, 60)))
                       .isoformat() + "Z",
    })

def notification_msg(channel: str) -> str:
    return json.dumps({
        "notificationId": f"NOTIF-{random.randint(10000, 99999)}",
        "channel":        channel,
        "recipient":      f"user{random.randint(1,9999)}@example.com",
        "template":       random.choice(["order_confirm", "ship_update", "promo", "reminder"]),
        "locale":         random.choice(["en", "de", "fr", "es"]),
        "scheduledAt":    datetime.utcnow().isoformat() + "Z",
    })

def inventory_msg() -> str:
    return json.dumps({
        "eventType": random.choice(["STOCK_UPDATE", "REORDER_TRIGGER", "SHRINKAGE"]),
        "sku":       f"SKU-{random.randint(100, 999)}",
        "warehouse": random.choice(["WH-EU-01", "WH-US-EAST", "WH-APAC"]),
        "qty":       random.randint(-50, 500),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })

def dlq_msg(original_queue: str, error: str) -> str:
    return json.dumps({
        "originalQueue":  original_queue,
        "error":          error,
        "retryCount":     random.randint(3, 10),
        "failedAt":       (datetime.utcnow() - timedelta(hours=random.randint(1, 48)))
                          .isoformat() + "Z",
        "payload":        order_msg(),
    })

def tcq_msg(transaction_id: str = None) -> str:
    """Transfer Control Queue message — used for two-phase-commit coordination."""
    return json.dumps({
        "transactionId": transaction_id or f"TXN-{random.randint(1000000, 9999999)}",
        "phase":         random.choice(["PREPARE", "COMMIT", "ROLLBACK"]),
        "participants":  [f"svc-{s}" for s in random.sample(
            ["orders", "payments", "inventory", "notifications"], k=random.randint(2, 4))],
        "timeout":       random.randint(30, 300),
        "initiatedAt":   datetime.utcnow().isoformat() + "Z",
    })

def audit_event() -> str:
    return json.dumps({
        "eventId":   f"EVT-{random.randint(1000000, 9999999)}",
        "actor":     random.choice(["service-orders", "service-payments", "user-api", "scheduler"]),
        "action":    random.choice(["CREATE", "UPDATE", "DELETE", "READ", "EXPORT"]),
        "resource":  random.choice(["Order", "Payment", "Customer", "Product"]),
        "resourceId": str(random.randint(10000, 99999)),
        "ip":        f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })

def large_msg() -> str:
    """~8 KB payload to drive up store/memory usage."""
    items = [
        {
            "productId":   f"PROD-{random.randint(10000, 99999)}",
            "name":        "".join(random.choices(string.ascii_letters + " ", k=40)),
            "description": "".join(random.choices(string.ascii_letters + " ,.", k=200)),
            "price":       round(random.uniform(1, 9999), 2),
            "attributes":  {k: "".join(random.choices(string.ascii_letters, k=20))
                            for k in ["color", "size", "material", "brand", "origin"]},
        }
        for _ in range(25)
    ]
    return json.dumps({"type": "CATALOG_SYNC", "batchId": f"BATCH-{random.randint(1,999)}", "items": items})


# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

def fill(queue: str, factory, n: int, label: str = ""):
    tag = label or queue
    create_queue(queue)
    ok = 0
    for i in range(n):
        body = factory() if callable(factory) else factory
        if send(queue, body):
            ok += 1
        if n > 20 and (i + 1) % 20 == 0:
            print(f"    ... {i+1}/{n}")
    status = "OK" if ok == n else ("PARTIAL" if ok > 0 else "FAILED")
    print(f"  {status:<8} {tag} ({ok}/{n} messages)")


SCENARIOS = [
    # -----------------------------------------------------------------------
    # Normal processing queues — show healthy backlog
    # -----------------------------------------------------------------------
    ("SECTION", "Normal processing queues"),
    ("QUEUE", "orders.new",         lambda: order_msg(status="NEW"),        50),
    ("QUEUE", "orders.processing",  lambda: order_msg(status="PROCESSING"), 18),
    ("QUEUE", "orders.completed",   lambda: order_msg(status="COMPLETED"),   4),
    ("QUEUE", "orders.cancellation",lambda: order_msg(status="CANCELLED"),   7),

    ("SECTION", "Payment queues"),
    ("QUEUE", "payments.incoming",  payment_msg,  35),
    ("QUEUE", "payments.processing",payment_msg,   9),
    ("QUEUE", "payments.settled",   payment_msg,   3),

    ("SECTION", "Notification queues"),
    ("QUEUE", "notifications.email", lambda: notification_msg("email"), 22),
    ("QUEUE", "notifications.sms",   lambda: notification_msg("sms"),    8),
    ("QUEUE", "notifications.push",  lambda: notification_msg("push"),   5),

    ("SECTION", "Inventory / catalogue"),
    ("QUEUE", "inventory.updates",  inventory_msg, 30),
    ("QUEUE", "inventory.reorders", inventory_msg,  6),
    ("QUEUE", "catalogue.sync",     large_msg,      12),

    # -----------------------------------------------------------------------
    # High-volume audit / event queues — drive up message counts
    # -----------------------------------------------------------------------
    ("SECTION", "High-volume audit & event queues (store usage)"),
    ("QUEUE", "events.audit",       audit_event, 150),
    ("QUEUE", "events.clickstream", audit_event, 200),
    ("QUEUE", "events.metrics",     audit_event,  80),

    # -----------------------------------------------------------------------
    # Large-message queue — drive up memory/store percentage
    # -----------------------------------------------------------------------
    ("SECTION", "Bulk export queue (large messages → store pressure)"),
    ("QUEUE", "bulk.export",        large_msg,  20),
    ("QUEUE", "bulk.import",        large_msg,  15),

    # -----------------------------------------------------------------------
    # DLQ — dead letter queues with failed messages
    # -----------------------------------------------------------------------
    ("SECTION", "Dead Letter Queues (DLQ)"),
    ("QUEUE", "DLQ.orders.new",
     lambda: dlq_msg("orders.new", "NullPointerException: customerId is null"), 14),
    ("QUEUE", "DLQ.payments.incoming",
     lambda: dlq_msg("payments.incoming", "ConnectionTimeoutException: provider Stripe unreachable"), 8),
    ("QUEUE", "DLQ.notifications.email",
     lambda: dlq_msg("notifications.email", "InvalidRecipientException: malformed address"), 5),
    ("QUEUE", "DLQ.inventory.updates",
     lambda: dlq_msg("inventory.updates", "OptimisticLockException: concurrent update detected"), 11),
    ("QUEUE", "ActiveMQ.DLQ",
     lambda: dlq_msg("unknown", "RedeliveryPolicy: max redeliveries exceeded"), 3),

    # -----------------------------------------------------------------------
    # TCQ — Transfer/Transaction Control Queues (2-phase commit coordination)
    # -----------------------------------------------------------------------
    ("SECTION", "Transaction Control Queues (TCQ)"),
    ("QUEUE", "TCQ.orders",    tcq_msg, 10),
    ("QUEUE", "TCQ.payments",  tcq_msg,  7),
    ("QUEUE", "TCQ.inventory", tcq_msg,  4),

    # -----------------------------------------------------------------------
    # Stalled / zombie queues — large backlog, no consumers
    # -----------------------------------------------------------------------
    ("SECTION", "Stalled queues (large backlog — no consumers)"),
    ("QUEUE", "legacy.migration.queue",  lambda: order_msg(status="MIGRATING"),  60),
    ("QUEUE", "integration.partner-api", payment_msg,                             30),
]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"\nActiveMQ Dashboard Simulator")
    print(f"Target : {BASE_URL}  broker={BROKER}")
    print(f"Started: {datetime.utcnow().isoformat()}Z\n")

    # Verify connectivity
    try:
        resp = jolokia_post({"type": "read",
                             "mbean": f"org.apache.activemq:type=Broker,brokerName={BROKER}",
                             "attribute": "BrokerName"})
        if resp.get("status") != 200:
            print(f"ERROR: Cannot reach broker '{BROKER}' at {BASE_URL}")
            print(f"       Jolokia response: {resp}")
            sys.exit(1)
        print(f"Connected to broker: {resp['value']}\n")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    total_queues = 0
    total_messages = 0

    for scenario in SCENARIOS:
        if scenario[0] == "SECTION":
            print(f"\n=== {scenario[1]} ===")
            continue

        _, queue, factory, count = scenario
        fill(queue, factory, count)
        total_queues += 1
        total_messages += count

    print(f"\n{'─'*60}")
    print(f"Done. Created {total_queues} queues, sent {total_messages} messages.")

    _tune_limits()

    print(f"Open the dashboard and refresh to see the data.\n")


def _tune_limits():
    """Lower broker limits so usage percentages show realistic non-zero values."""
    print("\n=== Tuning broker limits for realistic usage display ===")

    broker_mbean = f"org.apache.activemq:type=Broker,brokerName={BROKER}"

    # --- measure actual store bytes across all queues ---
    search = jolokia_post({"type": "search",
                           "mbean": f"org.apache.activemq:type=Broker,brokerName={BROKER},"
                                    "destinationType=Queue,destinationName=*"})
    mbeans = search.get("value", [])

    bulk = [{"type": "read", "mbean": m, "attribute": ["StoreMessageSize", "MemoryUsageByteCount"]}
            for m in mbeans]
    results = jolokia_post(bulk) if bulk else []

    total_store_bytes  = sum(r["value"].get("StoreMessageSize", 0)
                             for r in (results if isinstance(results, list) else [])
                             if r.get("status") == 200)
    total_memory_bytes = sum(r["value"].get("MemoryUsageByteCount", 0)
                             for r in (results if isinstance(results, list) else [])
                             if r.get("status") == 200)

    print(f"  Actual store bytes : {total_store_bytes:,}  ({total_store_bytes/1024/1024:.1f} MB)")
    print(f"  Actual memory bytes: {total_memory_bytes:,}  ({total_memory_bytes/1024/1024:.1f} MB)")

    # Target ~25-35% for store and ~15-20% for memory
    # Use at least 32 MB floors so limits stay sane.
    if total_store_bytes > 0:
        store_limit = max(int(total_store_bytes * 3.5), 32 * 1024 * 1024)
    else:
        store_limit = 64 * 1024 * 1024   # 64 MB fallback

    # MemoryPercentUsage tracks broker heap for pending dispatches.
    # Persistent messages are on disk so memory usage will be low;
    # set the limit proportionally smaller to surface a visible %.
    memory_limit = max(store_limit * 2, 128 * 1024 * 1024)

    # Temp usage: no temp destinations in our scenario, keep it small
    temp_limit = 64 * 1024 * 1024

    def write_attr(attr, value):
        r = jolokia_post({"type": "write", "mbean": broker_mbean,
                          "attribute": attr, "value": value})
        ok = r.get("status") == 200
        print(f"  Set {attr} = {value:,} bytes ({value/1024/1024:.0f} MB)  {'OK' if ok else 'FAILED'}")

    write_attr("StoreLimit",  store_limit)
    write_attr("MemoryLimit", memory_limit)
    write_attr("TempLimit",   temp_limit)


if __name__ == "__main__":
    main()
