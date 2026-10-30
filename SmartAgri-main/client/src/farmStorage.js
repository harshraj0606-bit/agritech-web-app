export const FARM_STORAGE_KEY = "smartAgriFarms";
export const FARM_UPDATED_EVENT = "smartAgriFarmsUpdated";

export function readFarms() {
  const savedFarms = localStorage.getItem(FARM_STORAGE_KEY);
  if (!savedFarms) {
    return [];
  }

  const farms = JSON.parse(savedFarms);
  if (!Array.isArray(farms)) {
    throw new Error("Saved farm data has an invalid format.");
  }

  return farms;
}

export function addFarm(farm) {
  const farms = readFarms();
  const updatedFarms = [
    { ...farm, _id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ...farms,
  ];

  localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(updatedFarms));
  window.dispatchEvent(new Event(FARM_UPDATED_EVENT));

  return updatedFarms;
}
