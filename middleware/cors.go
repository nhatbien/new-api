package middleware

import (
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "New-Api-User", "X-Requested-With", "Cache-Control", "Pragma"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.MaxAge = 12 * time.Hour
	frontendBaseUrls := getFrontendBaseUrls()
	if len(frontendBaseUrls) > 0 {
		config.AllowOrigins = frontendBaseUrls
	} else {
		config.AllowOriginFunc = isValidCorsOrigin
	}
	return cors.New(config)
}

func getFrontendBaseUrls() []string {
	frontendBaseUrl := os.Getenv("FRONTEND_BASE_URL")
	if frontendBaseUrl == "" {
		return nil
	}

	urls := make([]string, 0)
	for _, rawUrl := range strings.Split(frontendBaseUrl, ",") {
		trimmedUrl := strings.TrimSuffix(strings.TrimSpace(rawUrl), "/")
		if trimmedUrl != "" {
			urls = append(urls, trimmedUrl)
		}
	}

	return urls
}

func isValidCorsOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func PoweredBy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
