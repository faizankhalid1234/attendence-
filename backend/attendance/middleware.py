from django.http import JsonResponse


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = JsonResponse({"ok": True})
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin")
        if origin:
            # Credentials ke sath `*` allowed nahi — explicit origin chahiye
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Email-Test-Secret"
        response["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response
