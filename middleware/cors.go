package middleware

import (
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/publicsuffix"
)

func CORS() gin.HandlerFunc {
	allowMethods := []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	allowHeaders := []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "New-Api-User", "X-Requested-With", "Cache-Control", "Pragma"}
	exposeHeaders := []string{"Content-Length"}
	frontendBaseUrls := getFrontendBaseUrls()
	allowOrigin := isValidCorsOrigin
	if len(frontendBaseUrls) > 0 {
		allowedOrigins := make(map[string]struct{}, len(frontendBaseUrls))
		for _, frontendBaseUrl := range frontendBaseUrls {
			allowedOrigins[frontendBaseUrl] = struct{}{}
		}
		allowOrigin = func(origin string) bool {
			if isLocalDevCorsOrigin(origin) {
				return true
			}
			_, ok := allowedOrigins[normalizeCorsOrigin(origin)]
			return ok
		}
	}
	return func(c *gin.Context) {
		header := c.Writer.Header()
		addHeaderValue(header, "Vary", "Origin")
		header.Set("Cache-Control", "no-store")
		origin := c.Request.Header.Get("Origin")
		if origin != "" && (allowOrigin(origin) || isSameSiteCorsOrigin(origin, c.Request.Host)) {
			header.Set("Access-Control-Allow-Origin", origin)
			header.Set("Access-Control-Allow-Credentials", "true")
			header.Set("Access-Control-Allow-Methods", strings.Join(allowMethods, ","))
			header.Set("Access-Control-Allow-Headers", strings.Join(allowHeaders, ","))
			header.Set("Access-Control-Expose-Headers", strings.Join(exposeHeaders, ","))
			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatus(http.StatusNoContent)
				return
			}
		} else if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}
		c.Next()
	}
}

func addHeaderValue(header http.Header, key string, value string) {
	for _, values := range header.Values(key) {
		for _, existing := range strings.Split(values, ",") {
			if strings.EqualFold(strings.TrimSpace(existing), value) {
				return
			}
		}
	}
	header.Add(key, value)
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

func isLocalDevCorsOrigin(origin string) bool {
	if strings.EqualFold(os.Getenv("CORS_ALLOW_LOCALHOST"), "false") {
		return false
	}

	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	hostname := strings.ToLower(parsed.Hostname())
	return hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1"
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

func isSameSiteCorsOrigin(origin string, requestHost string) bool {
	parsedOrigin, err := url.Parse(origin)
	if err != nil || parsedOrigin.Host == "" || requestHost == "" {
		return false
	}

	originDomain := getRegistrableDomain(parsedOrigin.Hostname())
	requestDomain := getRegistrableDomain(strings.Split(requestHost, ":")[0])

	return originDomain != "" && originDomain == requestDomain
}

func getRegistrableDomain(hostname string) string {
	hostname = strings.ToLower(strings.TrimSpace(hostname))
	if hostname == "" || strings.Contains(hostname, ":") || hostname == "localhost" {
		return ""
	}
	registrableDomain, err := publicsuffix.EffectiveTLDPlusOne(hostname)
	if err != nil {
		return ""
	}
	return registrableDomain
}

func PoweredBy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
