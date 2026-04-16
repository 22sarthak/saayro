from fastapi import APIRouter

from saayro_api.api.routes import (
    auth,
    buddy,
    connected_travel,
    connections,
    exports,
    itinerary,
    status,
    trips,
)

api_router = APIRouter()
api_router.include_router(status.router)
api_router.include_router(trips.router, prefix="/v1")
api_router.include_router(itinerary.router, prefix="/v1")
api_router.include_router(buddy.router, prefix="/v1")
api_router.include_router(exports.router, prefix="/v1")
api_router.include_router(connections.router, prefix="/v1")
api_router.include_router(connected_travel.router, prefix="/v1")
api_router.include_router(auth.router, prefix="/v1")

