package router

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetApiRouterRegistersWithoutDuplicateRoutePanic(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("SetApiRouter panicked: %v", r)
		}
	}()

	SetApiRouter(gin.New())
}

func TestGetFrontendRedirectBaseUrlUsesFirstConfiguredUrl(t *testing.T) {
	got := getFrontendRedirectBaseUrl(" https://app.example.com/ , https://www.example.com ")
	if want := "https://app.example.com"; got != want {
		t.Fatalf("getFrontendRedirectBaseUrl() = %q, want %q", got, want)
	}
}

func TestGetFrontendRedirectBaseUrlReturnsEmptyWhenUnset(t *testing.T) {
	got := getFrontendRedirectBaseUrl(" , ")
	if got != "" {
		t.Fatalf("getFrontendRedirectBaseUrl() = %q, want empty", got)
	}
}
