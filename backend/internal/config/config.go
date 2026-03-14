package config

import "os"

type Config struct {
	ActiveMQURL      string
	ActiveMQUser     string
	ActiveMQPassword string
	Port             string
	BrokerName       string
}

func Load() *Config {
	return &Config{
		ActiveMQURL:      getEnv("ACTIVEMQ_URL", "http://localhost:8161"),
		ActiveMQUser:     getEnv("ACTIVEMQ_USER", "admin"),
		ActiveMQPassword: getEnv("ACTIVEMQ_PASSWORD", "admin"),
		Port:             getEnv("PORT", "8080"),
		BrokerName:       getEnv("BROKER_NAME", "localhost"),
	}
}

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}
