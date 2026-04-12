"""
Custom CORS middleware to handle preflight requests properly.
This ensures CORS headers are added even if django-cors-headers doesn't process them.
"""
from django.http import HttpResponse


class CustomCORSMiddleware:
    """
    Custom middleware to handle CORS preflight requests.
    Place this BEFORE CorsMiddleware for maximum compatibility.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # List of allowed origins
        self.allowed_origins = [
            "https://tms-gules-iota.vercel.app",
            "https://tmsethnotec.netlify.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    def __call__(self, request):
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            return self.handle_preflight(request)

        response = self.get_response(request)

        # Add CORS headers to all responses
        self.add_cors_headers(request, response)

        return response

    def handle_preflight(self, request):
        """Handle CORS preflight (OPTIONS) request"""
        response = HttpResponse()
        self.add_cors_headers(request, response)
        response.status_code = 200
        return response

    def add_cors_headers(self, request, response):
        """Add CORS headers to response"""
        origin = request.META.get('HTTP_ORIGIN', '')

        # Only add CORS headers if origin is allowed
        if origin in self.allowed_origins or not origin:
            response['Access-Control-Allow-Origin'] = origin or '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
            response['Access-Control-Allow-Headers'] = (
                'Content-Type, Authorization, X-Requested-With, '
                'Accept, Origin, X-CSRFToken, X-API-KEY'
            )
            response['Access-Control-Max-Age'] = '86400'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'

        return response
