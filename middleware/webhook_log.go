package middleware

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

const webhookLogMaxFieldSize = 64 * 1024

type webhookLogResponseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *webhookLogResponseWriter) Write(data []byte) (int, error) {
	if w.body.Len() < webhookLogMaxFieldSize {
		remaining := webhookLogMaxFieldSize - w.body.Len()
		if len(data) > remaining {
			w.body.Write(data[:remaining])
		} else {
			w.body.Write(data)
		}
	}
	return w.ResponseWriter.Write(data)
}

func truncateWebhookLogValue(value string) string {
	if len(value) <= webhookLogMaxFieldSize {
		return value
	}
	return value[:webhookLogMaxFieldSize] + "...[truncated]"
}

func inferWebhookOutcome(status int, responseBody string, ginErrors string) string {
	if status >= http.StatusBadRequest || ginErrors != "" {
		return "failed"
	}
	lowerBody := strings.ToLower(strings.TrimSpace(responseBody))
	if lowerBody == "fail" || strings.Contains(lowerBody, `"message":"error"`) || strings.Contains(lowerBody, `"success":false`) {
		return "failed"
	}
	return "success"
}

func WebhookLog(provider string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var requestBody []byte
		if c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err != nil {
				logger.LogError(c.Request.Context(), "failed to read webhook request body for logging: "+err.Error())
			} else {
				requestBody = bodyBytes
			}
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		responseBuffer := bytes.NewBuffer(nil)
		writer := &webhookLogResponseWriter{
			ResponseWriter: c.Writer,
			body:           responseBuffer,
		}
		c.Writer = writer

		c.Next()

		status := c.Writer.Status()
		if status == 0 {
			status = http.StatusOK
		}
		responseBody := responseBuffer.String()
		ginErrors := c.Errors.String()
		outcome := inferWebhookOutcome(status, responseBody, ginErrors)

		headers := common.GetJsonString(c.Request.Header)
		entry := &model.WebhookLog{
			Provider:       provider,
			Method:         c.Request.Method,
			Path:           c.Request.URL.Path,
			Query:          c.Request.URL.RawQuery,
			ClientIP:       c.ClientIP(),
			Headers:        truncateWebhookLogValue(headers),
			RequestBody:    truncateWebhookLogValue(string(requestBody)),
			ResponseStatus: status,
			ResponseBody:   truncateWebhookLogValue(responseBody),
			Outcome:        outcome,
			Error:          truncateWebhookLogValue(ginErrors),
			CreatedAt:      time.Now().Unix(),
		}

		if err := model.CreateWebhookLog(entry); err != nil {
			logger.LogError(c.Request.Context(), "failed to save webhook log: "+err.Error())
		}
	}
}
