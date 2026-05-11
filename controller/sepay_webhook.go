package controller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
)

func SepayWebhook(c *gin.Context) {
	if !setting.SepayEnabled || strings.TrimSpace(setting.SepayWebhookSecret) == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook rejected reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusForbidden, "webhook disabled")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "logged",
	})
}
