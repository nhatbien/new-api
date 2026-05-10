package middleware

import (
	"net/url"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/publicsuffix"
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
		allowedOrigins := make(map[string]struct{}, len(frontendBaseUrls))
		for _, frontendBaseUrl := range frontendBaseUrls {
			allowedOrigins[frontendBaseUrl] = struct{}{}
		}
		config.AllowOriginFunc = func(origin string) bool {
			_, ok := allowedOrigins[normalizeCorsOrigin(origin)]
			return ok
		}
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

	urls := make(map[string]struct{})
	for _, rawUrl := range strings.Split(frontendBaseUrl, ",") {
		origin := normalizeCorsOrigin(rawUrl)
		if origin != "" {
			urls[origin] = struct{}{}
			for _, variant := range getCorsOriginDomainVariants(origin) {
				urls[variant] = struct{}{}
			}
		}
	}

	frontendBaseUrls := make([]string, 0, len(urls))
	for frontendBaseUrl := range urls {
		frontendBaseUrls = append(frontendBaseUrls, frontendBaseUrl)
	}
	sort.Strings(frontendBaseUrls)

	return frontendBaseUrls
}

func isValidCorsOrigin(origin string) bool {
	return normalizeCorsOrigin(origin) != ""
}

func normalizeCorsOrigin(origin string) string {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return ""
	}

	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return ""
	}

	parsed.User = nil
	parsed.Path = ""
	parsed.RawPath = ""
	parsed.ForceQuery = false
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.Host = strings.ToLower(parsed.Host)
	if (parsed.Scheme == "http" && strings.HasSuffix(parsed.Host, ":80")) ||
		(parsed.Scheme == "https" && strings.HasSuffix(parsed.Host, ":443")) {
		parsed.Host = parsed.Hostname()
	}

	return strings.TrimSuffix(parsed.String(), "/")
}

func getCorsOriginDomainVariants(origin string) []string {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" {
		return nil
	}

	hostname := parsed.Hostname()
	if hostname == "" || strings.Contains(hostname, ":") || hostname == "localhost" {
		return nil
	}

	registrableDomain, err := publicsuffix.EffectiveTLDPlusOne(hostname)
	if err != nil || registrableDomain == hostname {
		return nil
	}

	rootVariant := *parsed
	rootVariant.Host = registrableDomain
	if port := parsed.Port(); port != "" {
		rootVariant.Host += ":" + port
	}

	return []string{rootVariant.String()}
}

func PoweredBy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
