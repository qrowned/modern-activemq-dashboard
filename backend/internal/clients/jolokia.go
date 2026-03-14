package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type JolokiaClient struct {
	baseURL    string
	username   string
	password   string
	httpClient *http.Client
}

type JolokiaRequest struct {
	Type      string        `json:"type"`
	MBean     string        `json:"mbean"`
	Attribute string        `json:"attribute,omitempty"`
	Operation string        `json:"operation,omitempty"`
	Arguments []interface{} `json:"arguments,omitempty"`
}

type JolokiaResponse struct {
	Status    int             `json:"status"`
	Timestamp int64           `json:"timestamp"`
	Request   json.RawMessage `json:"request"`
	Value     json.RawMessage `json:"value"`
	Error     string          `json:"error,omitempty"`
	ErrorType string          `json:"error_type,omitempty"`
}

func NewJolokiaClient(baseURL, username, password string) *JolokiaClient {
	return &JolokiaClient{
		baseURL:  baseURL,
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *JolokiaClient) Read(mbean, attribute string) (*JolokiaResponse, error) {
	endpoint := fmt.Sprintf("%s/api/jolokia/read/%s/%s",
		c.baseURL,
		url.PathEscape(mbean),
		url.PathEscape(attribute),
	)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Origin", c.baseURL)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	var jolokiaResp JolokiaResponse
	if err := json.Unmarshal(body, &jolokiaResp); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	if jolokiaResp.Status != 200 {
		return nil, fmt.Errorf("jolokia error (status %d): %s", jolokiaResp.Status, jolokiaResp.Error)
	}

	return &jolokiaResp, nil
}

func (c *JolokiaClient) ReadMultiple(mbean string, attributes []string) (*JolokiaResponse, error) {
	attrStr := ""
	for i, a := range attributes {
		if i > 0 {
			attrStr += ","
		}
		attrStr += a
	}
	return c.Read(mbean, attrStr)
}

func (c *JolokiaClient) Exec(mbean, operation string, args ...interface{}) (*JolokiaResponse, error) {
	jolokiaReq := JolokiaRequest{
		Type:      "exec",
		MBean:     mbean,
		Operation: operation,
	}
	if len(args) > 0 {
		jolokiaReq.Arguments = args
	}

	payload, err := json.Marshal(jolokiaReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	endpoint := fmt.Sprintf("%s/api/jolokia", c.baseURL)
	req, err := http.NewRequest("POST", endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", c.baseURL)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	var jolokiaResp JolokiaResponse
	if err := json.Unmarshal(body, &jolokiaResp); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	if jolokiaResp.Status != 200 {
		return nil, fmt.Errorf("jolokia error (status %d): %s", jolokiaResp.Status, jolokiaResp.Error)
	}

	return &jolokiaResp, nil
}

func (c *JolokiaClient) Search(pattern string) ([]string, error) {
	endpoint := fmt.Sprintf("%s/api/jolokia/search/%s", c.baseURL, url.PathEscape(pattern))
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating search request: %w", err)
	}
	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Origin", c.baseURL)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing search request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading search response: %w", err)
	}

	var jolokiaResp struct {
		Status int      `json:"status"`
		Value  []string `json:"value"`
		Error  string   `json:"error,omitempty"`
	}
	if err := json.Unmarshal(body, &jolokiaResp); err != nil {
		return nil, fmt.Errorf("parsing search response: %w", err)
	}

	if jolokiaResp.Status != 200 {
		return nil, fmt.Errorf("jolokia search error (status %d): %s", jolokiaResp.Status, jolokiaResp.Error)
	}

	return jolokiaResp.Value, nil
}

func (c *JolokiaClient) Ping() error {
	endpoint := fmt.Sprintf("%s/api/jolokia/version", c.baseURL)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Origin", c.baseURL)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
