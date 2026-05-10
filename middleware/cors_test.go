package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSAddsHeadersForConfiguredFrontendOrigin(t *testing.T) {
	t.Setenv("FRONTEND_BASE_URL", "https://apigiare.vn")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/api/group", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/group", nil)
	req.Header.Set("Origin", "https://apigiare.vn")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://apigiare.vn" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, "https://apigiare.vn")
	}
	if got := recorder.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("Access-Control-Allow-Credentials = %q, want true", got)
	}
	if got := recorder.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", got)
	}
}
