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

func TestCORSAddsHeadersForSameSiteFrontendOrigin(t *testing.T) {
	t.Setenv("FRONTEND_BASE_URL", "https://console.example.com")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/api/group", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	req := httptest.NewRequest(http.MethodGet, "https://api.apigiare.vn/api/group", nil)
	req.Host = "api.apigiare.vn"
	req.Header.Set("Origin", "https://apigiare.vn")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://apigiare.vn" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, "https://apigiare.vn")
	}
}

func TestCORSAddsHeadersForLocalDevOrigin(t *testing.T) {
	t.Setenv("FRONTEND_BASE_URL", "https://apigiare.vn")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/api/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	req := httptest.NewRequest(http.MethodGet, "https://api.apigiare.vn/api/status", nil)
	req.Host = "api.apigiare.vn"
	req.Header.Set("Origin", "http://localhost:3000")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:3000")
	}
	if got := recorder.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("Access-Control-Allow-Credentials = %q, want true", got)
	}
}

func TestCORSCanDisableLocalDevOrigin(t *testing.T) {
	t.Setenv("FRONTEND_BASE_URL", "https://apigiare.vn")
	t.Setenv("CORS_ALLOW_LOCALHOST", "false")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/api/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	req := httptest.NewRequest(http.MethodOptions, "https://api.apigiare.vn/api/status", nil)
	req.Host = "api.apigiare.vn"
	req.Header.Set("Origin", "http://localhost:3000")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want empty", got)
	}
}

func TestCORSRejectsPreflightForUnrelatedOrigin(t *testing.T) {
	t.Setenv("FRONTEND_BASE_URL", "https://console.example.com")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/api/group", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	req := httptest.NewRequest(http.MethodOptions, "https://api.apigiare.vn/api/group", nil)
	req.Host = "api.apigiare.vn"
	req.Header.Set("Origin", "https://other.example.net")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want empty", got)
	}
}

func TestAddHeaderValueDoesNotDuplicateCommaSeparatedValues(t *testing.T) {
	header := http.Header{}
	header.Add("Vary", "Accept-Encoding, Origin")

	addHeaderValue(header, "Vary", "Origin")

	if got, want := len(header.Values("Vary")), 1; got != want {
		t.Fatalf("Vary value count = %d, want %d", got, want)
	}
	if got := header.Get("Vary"); got != "Accept-Encoding, Origin" {
		t.Fatalf("Vary = %q, want %q", got, "Accept-Encoding, Origin")
	}
}
