package router

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-gonic/gin"
)

func SetRouter(router *gin.Engine, assets ThemeAssets) {
	SetApiRouter(router)
	SetDashboardRouter(router)
	SetRelayRouter(router)
	SetVideoRouter(router)
	frontendBaseUrl := getFrontendRedirectBaseUrl(os.Getenv("FRONTEND_BASE_URL"))
	if frontendBaseUrl == "" {
		SetWebRouter(router, assets)
	} else {
		router.NoRoute(func(c *gin.Context) {
			c.Set(middleware.RouteTagKey, "web")
			c.Redirect(http.StatusMovedPermanently, fmt.Sprintf("%s%s", frontendBaseUrl, c.Request.RequestURI))
		})
	}
}

func getFrontendRedirectBaseUrl(frontendBaseUrl string) string {
	for _, rawUrl := range strings.Split(frontendBaseUrl, ",") {
		if url := strings.TrimSuffix(strings.TrimSpace(rawUrl), "/"); url != "" {
			return url
		}
	}
	return ""
}
