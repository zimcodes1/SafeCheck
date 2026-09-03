from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.simulator import run_scenario, list_scenarios

router = APIRouter(prefix="/simulate", tags=["Simulation"])


class ScenarioRequest(BaseModel):
    scenario_name: str


@router.post("/scenario")
async def simulate_scenario(req: ScenarioRequest):
    name = req.scenario_name.lower()
    if name not in list_scenarios():
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {req.scenario_name}")
    try:
        result = run_scenario(name)
        return {"ok": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
