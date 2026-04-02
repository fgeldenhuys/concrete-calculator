"use client";

import { useEffect, useState } from "react";

type ActiveTab = "plate" | "kettlebell";
type SolveMode = "width" | "diameter";
type KettlebellSolveMode = "diameter" | "mass";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

const CM_TO_M = 0.01;
const MM_TO_M = 0.001;
const KG_TO_G = 1000;
const CONCRETE_DENSITY_DEFAULT = 2350;
const STEEL_DENSITY = 7850;
const STORAGE_KEY = "concrete-weight-calculator-controls";

type PersistedControls = {
  activeTab: ActiveTab;
  solveMode: SolveMode;
  targetMassKg: number;
  outerDiameterCm: number;
  widthMm: number;
  openingDiameterMm: number;
  concreteDensity: number;
  innerRingEnabled: boolean;
  innerRingThicknessMm: number;
  outerRingEnabled: boolean;
  outerRingThicknessMm: number;
  reinforcementEnabled: boolean;
  reinforcementCount: number;
  reinforcementDiameterMm: number;
  kettlebellSolveMode: KettlebellSolveMode;
  kettlebellTargetMassKg: number;
  kettlebellDiameterMm: number;
  kettlebellFlattenMm: number;
  kettlebellConcreteDensity: number;
  kettlebellHandleLengthMm: number;
  kettlebellHandleHeightMm: number;
  kettlebellHandleEmbedMm: number;
  kettlebellPipeOuterDiameterMm: number;
  kettlebellPipeWallThicknessMm: number;
  kettlebellHandleFilledWithConcrete: boolean;
};

type KettlebellMetrics = {
  concreteBodyVolumeM3: number;
  concreteInHandleVolumeM3: number;
  concreteVolumeM3: number;
  steelVolumeM3: number;
  displacedConcreteVolumeM3: number;
  steelMassKg: number;
  concreteMassKg: number;
  totalMassKg: number;
  baseRadiusM: number;
  handleLengthM: number;
};

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatCm(value: number) {
  return `${round(value, 1).toFixed(1)} cm`;
}

function formatMm(value: number) {
  return `${round(value, 1).toFixed(1)} mm`;
}

function formatMeters(value: number) {
  return `${round(value, 3).toFixed(3)} m`;
}

function formatKg(value: number) {
  return `${round(value, 2).toFixed(2)} kg`;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: SliderProps) {
  return (
    <label className="slider">
      <div className="slider__header">
        <span>{label}</span>
        <strong>
          {round(value, step < 1 ? 1 : 0)}
          {unit}
        </strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="slider__scale">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </label>
  );
}

function segmentArea(outerRadiusM: number, innerRadiusM: number) {
  return Math.PI * (outerRadiusM ** 2 - innerRadiusM ** 2);
}

function sphereCapVolume(radiusM: number, capHeightM: number) {
  return Math.PI * capHeightM ** 2 * (radiusM - capHeightM / 3);
}

function solveKettlebellDiameterM(
  targetMassKg: number,
  flattenM: number,
  concreteDensity: number,
  handleLengthM: number,
  handleHeightM: number,
  handleEmbedM: number,
  pipeOuterRadiusM: number,
  pipeWallM: number,
  handleFilledWithConcrete: boolean,
) {
  const wallError = pipeWallM <= 0 || pipeWallM >= pipeOuterRadiusM;
  if (wallError || concreteDensity <= 0 || targetMassKg <= 0) {
    return { error: "Enter valid density and steel pipe dimensions before solving." };
  }

  const steelAreaM2 = Math.PI * (pipeOuterRadiusM ** 2 - (pipeOuterRadiusM - pipeWallM) ** 2);
  const pipeInnerAreaM2 = Math.PI * (pipeOuterRadiusM - pipeWallM) ** 2;
  const pipeOuterAreaM2 = Math.PI * pipeOuterRadiusM ** 2;
  const handleTotalLengthM = handleLengthM + 2 * (handleHeightM + handleEmbedM);
  const steelVolumeM3 = steelAreaM2 * handleTotalLengthM;
  const displacedByLegsM3 = pipeOuterAreaM2 * (2 * handleEmbedM);
  const concreteInHandleVolumeM3 = handleFilledWithConcrete
    ? pipeInnerAreaM2 * handleTotalLengthM
    : 0;
  const steelMassKg = steelVolumeM3 * STEEL_DENSITY;

  const massAtDiameter = (diameterM: number) => {
    const radiusM = diameterM / 2;
    if (radiusM <= 0 || flattenM < 0 || flattenM >= diameterM) {
      return null;
    }

    const sphereVolumeM3 = (4 / 3) * Math.PI * radiusM ** 3;
    const removedCapM3 = sphereCapVolume(radiusM, flattenM);
    const concreteBodyVolumeM3 = sphereVolumeM3 - removedCapM3;
    const concreteBodyNetVolumeM3 = concreteBodyVolumeM3 - displacedByLegsM3;
    const concreteVolumeM3 = concreteBodyNetVolumeM3 + concreteInHandleVolumeM3;

    if (concreteBodyNetVolumeM3 <= 0 || concreteVolumeM3 <= 0) {
      return null;
    }

    return concreteVolumeM3 * concreteDensity + steelMassKg;
  };

  const minDiameterM = Math.max(flattenM + 0.004, 0.04);
  let low = minDiameterM;
  let high = Math.max(0.32, low * 1.6);

  let massLow = massAtDiameter(low);
  while (low < high && massLow === null) {
    low += 0.005;
    massLow = massAtDiameter(low);
  }

  if (massLow === null) {
    return {
      error: "Increase sphere size or reduce handle embed depth to keep concrete volume positive.",
    };
  }

  if (targetMassKg < massLow) {
    return {
      error:
        "Target mass is below the minimum possible mass with this handle and flatten setup.",
    };
  }

  let massHigh = massAtDiameter(high);
  while (high < 1.8 && (massHigh === null || massHigh < targetMassKg)) {
    high *= 1.25;
    massHigh = massAtDiameter(high);
  }

  if (massHigh === null || massHigh < targetMassKg) {
    return {
      error: "Target mass is too high for the current slider limits. Increase the maximum diameter.",
    };
  }

  for (let index = 0; index < 50; index += 1) {
    const middle = (low + high) / 2;
    const massMiddle = massAtDiameter(middle);

    if (massMiddle === null) {
      low = middle;
      continue;
    }

    if (massMiddle < targetMassKg) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return { diameterM: (low + high) / 2 };
}

function computeKettlebellMetrics(
  diameterM: number,
  flattenM: number,
  concreteDensity: number,
  handleLengthM: number,
  handleHeightM: number,
  handleEmbedM: number,
  pipeOuterRadiusM: number,
  pipeWallM: number,
  handleFilledWithConcrete: boolean,
) {
  if (diameterM <= 0 || concreteDensity <= 0) {
    return { error: "Sphere diameter and concrete density must be above zero." };
  }

  if (flattenM < 0 || flattenM >= diameterM) {
    return {
      error: "Flatten amount must be zero or positive, and smaller than the full sphere diameter.",
    };
  }

  if (pipeOuterRadiusM <= 0 || pipeWallM <= 0 || pipeWallM >= pipeOuterRadiusM) {
    return {
      error: "Steel wall thickness must be positive and smaller than the pipe outer radius.",
    };
  }

  if (handleLengthM < 0 || handleHeightM < 0 || handleEmbedM < 0) {
    return { error: "Handle dimensions must be zero or positive." };
  }

  const radiusM = diameterM / 2;
  const sphereVolumeM3 = (4 / 3) * Math.PI * radiusM ** 3;
  const removedCapM3 = sphereCapVolume(radiusM, flattenM);
  const concreteBodyVolumeM3 = sphereVolumeM3 - removedCapM3;

  const steelAreaM2 =
    Math.PI * (pipeOuterRadiusM ** 2 - (pipeOuterRadiusM - pipeWallM) ** 2);
  const pipeInnerAreaM2 = Math.PI * (pipeOuterRadiusM - pipeWallM) ** 2;
  const pipeOuterAreaM2 = Math.PI * pipeOuterRadiusM ** 2;

  const handleLengthMTotal = handleLengthM + 2 * (handleHeightM + handleEmbedM);
  const steelVolumeM3 = steelAreaM2 * handleLengthMTotal;
  const displacedConcreteVolumeM3 = pipeOuterAreaM2 * (2 * handleEmbedM);
  const concreteBodyNetVolumeM3 = concreteBodyVolumeM3 - displacedConcreteVolumeM3;
  const concreteInHandleVolumeM3 = handleFilledWithConcrete
    ? pipeInnerAreaM2 * handleLengthMTotal
    : 0;
  const concreteVolumeM3 = concreteBodyNetVolumeM3 + concreteInHandleVolumeM3;

  if (concreteBodyNetVolumeM3 <= 0 || concreteVolumeM3 <= 0) {
    return {
      error:
        "Embedded pipe displaces the full concrete body. Reduce embed depth or increase sphere size.",
    };
  }

  const steelMassKg = steelVolumeM3 * STEEL_DENSITY;
  const concreteMassKg = concreteVolumeM3 * concreteDensity;
  const totalMassKg = steelMassKg + concreteMassKg;
  const baseRadiusM = Math.sqrt(Math.max(2 * radiusM * flattenM - flattenM ** 2, 0));

  return {
    metrics: {
      concreteBodyVolumeM3,
      concreteInHandleVolumeM3,
      concreteVolumeM3,
      steelVolumeM3,
      displacedConcreteVolumeM3,
      steelMassKg,
      concreteMassKg,
      totalMassKg,
      baseRadiusM,
      handleLengthM: handleLengthMTotal,
    } satisfies KettlebellMetrics,
  };
}

export default function Home() {
  const [hasLoadedSavedControls, setHasLoadedSavedControls] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("plate");

  const [solveMode, setSolveMode] = useState<SolveMode>("width");
  const [targetMassKg, setTargetMassKg] = useState(20);
  const [outerDiameterCm, setOuterDiameterCm] = useState(34);
  const [widthMm, setWidthMm] = useState(50);
  const [openingDiameterMm, setOpeningDiameterMm] = useState(52);
  const [concreteDensity, setConcreteDensity] = useState(CONCRETE_DENSITY_DEFAULT);

  const [innerRingEnabled, setInnerRingEnabled] = useState(true);
  const [innerRingThicknessMm, setInnerRingThicknessMm] = useState(4);

  const [outerRingEnabled, setOuterRingEnabled] = useState(false);
  const [outerRingThicknessMm, setOuterRingThicknessMm] = useState(4);

  const [reinforcementEnabled, setReinforcementEnabled] = useState(true);
  const [reinforcementCount, setReinforcementCount] = useState(4);
  const [reinforcementDiameterMm, setReinforcementDiameterMm] = useState(8);

  const [kettlebellSolveMode, setKettlebellSolveMode] =
    useState<KettlebellSolveMode>("diameter");
  const [kettlebellTargetMassKg, setKettlebellTargetMassKg] = useState(16);
  const [kettlebellDiameterMm, setKettlebellDiameterMm] = useState(220);
  const [kettlebellFlattenMm, setKettlebellFlattenMm] = useState(20);
  const [kettlebellConcreteDensity, setKettlebellConcreteDensity] =
    useState(CONCRETE_DENSITY_DEFAULT);
  const [kettlebellHandleLengthMm, setKettlebellHandleLengthMm] = useState(150);
  const [kettlebellHandleHeightMm, setKettlebellHandleHeightMm] = useState(85);
  const [kettlebellHandleEmbedMm, setKettlebellHandleEmbedMm] = useState(45);
  const [kettlebellPipeOuterDiameterMm, setKettlebellPipeOuterDiameterMm] = useState(28);
  const [kettlebellPipeWallThicknessMm, setKettlebellPipeWallThicknessMm] = useState(2.6);
  const [kettlebellHandleFilledWithConcrete, setKettlebellHandleFilledWithConcrete] =
    useState(false);

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(STORAGE_KEY);
      if (!savedValue) {
        setHasLoadedSavedControls(true);
        return;
      }

      const parsed = JSON.parse(savedValue) as Partial<PersistedControls>;

      if (parsed.activeTab === "plate" || parsed.activeTab === "kettlebell") {
        setActiveTab(parsed.activeTab);
      }
      if (parsed.solveMode === "width" || parsed.solveMode === "diameter") {
        setSolveMode(parsed.solveMode);
      }
      if (typeof parsed.targetMassKg === "number") {
        setTargetMassKg(parsed.targetMassKg);
      }
      if (typeof parsed.outerDiameterCm === "number") {
        setOuterDiameterCm(parsed.outerDiameterCm);
      }
      if (typeof parsed.widthMm === "number") {
        setWidthMm(parsed.widthMm);
      }
      if (typeof parsed.openingDiameterMm === "number") {
        setOpeningDiameterMm(parsed.openingDiameterMm);
      }
      if (typeof parsed.concreteDensity === "number") {
        setConcreteDensity(parsed.concreteDensity);
      }
      if (typeof parsed.innerRingEnabled === "boolean") {
        setInnerRingEnabled(parsed.innerRingEnabled);
      }
      if (typeof parsed.innerRingThicknessMm === "number") {
        setInnerRingThicknessMm(parsed.innerRingThicknessMm);
      }
      if (typeof parsed.outerRingEnabled === "boolean") {
        setOuterRingEnabled(parsed.outerRingEnabled);
      }
      if (typeof parsed.outerRingThicknessMm === "number") {
        setOuterRingThicknessMm(parsed.outerRingThicknessMm);
      }
      if (typeof parsed.reinforcementEnabled === "boolean") {
        setReinforcementEnabled(parsed.reinforcementEnabled);
      }
      if (typeof parsed.reinforcementCount === "number") {
        setReinforcementCount(parsed.reinforcementCount);
      }
      if (typeof parsed.reinforcementDiameterMm === "number") {
        setReinforcementDiameterMm(parsed.reinforcementDiameterMm);
      }
      if (parsed.kettlebellSolveMode === "diameter" || parsed.kettlebellSolveMode === "mass") {
        setKettlebellSolveMode(parsed.kettlebellSolveMode);
      }
      if (typeof parsed.kettlebellTargetMassKg === "number") {
        setKettlebellTargetMassKg(parsed.kettlebellTargetMassKg);
      }
      if (typeof parsed.kettlebellDiameterMm === "number") {
        setKettlebellDiameterMm(parsed.kettlebellDiameterMm);
      }
      if (typeof parsed.kettlebellFlattenMm === "number") {
        setKettlebellFlattenMm(parsed.kettlebellFlattenMm);
      }
      if (typeof parsed.kettlebellConcreteDensity === "number") {
        setKettlebellConcreteDensity(parsed.kettlebellConcreteDensity);
      }
      if (typeof parsed.kettlebellHandleLengthMm === "number") {
        setKettlebellHandleLengthMm(parsed.kettlebellHandleLengthMm);
      }
      if (typeof parsed.kettlebellHandleHeightMm === "number") {
        setKettlebellHandleHeightMm(parsed.kettlebellHandleHeightMm);
      }
      if (typeof parsed.kettlebellHandleEmbedMm === "number") {
        setKettlebellHandleEmbedMm(parsed.kettlebellHandleEmbedMm);
      }
      if (typeof parsed.kettlebellPipeOuterDiameterMm === "number") {
        setKettlebellPipeOuterDiameterMm(parsed.kettlebellPipeOuterDiameterMm);
      }
      if (typeof parsed.kettlebellPipeWallThicknessMm === "number") {
        setKettlebellPipeWallThicknessMm(parsed.kettlebellPipeWallThicknessMm);
      }
      if (typeof parsed.kettlebellHandleFilledWithConcrete === "boolean") {
        setKettlebellHandleFilledWithConcrete(parsed.kettlebellHandleFilledWithConcrete);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasLoadedSavedControls(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedControls) {
      return;
    }

    const controls: PersistedControls = {
      activeTab,
      solveMode,
      targetMassKg,
      outerDiameterCm,
      widthMm,
      openingDiameterMm,
      concreteDensity,
      innerRingEnabled,
      innerRingThicknessMm,
      outerRingEnabled,
      outerRingThicknessMm,
      reinforcementEnabled,
      reinforcementCount,
      reinforcementDiameterMm,
      kettlebellSolveMode,
      kettlebellTargetMassKg,
      kettlebellDiameterMm,
      kettlebellFlattenMm,
      kettlebellConcreteDensity,
      kettlebellHandleLengthMm,
      kettlebellHandleHeightMm,
      kettlebellHandleEmbedMm,
      kettlebellPipeOuterDiameterMm,
      kettlebellPipeWallThicknessMm,
      kettlebellHandleFilledWithConcrete,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  }, [
    activeTab,
    concreteDensity,
    hasLoadedSavedControls,
    innerRingEnabled,
    innerRingThicknessMm,
    kettlebellConcreteDensity,
    kettlebellDiameterMm,
    kettlebellFlattenMm,
    kettlebellHandleEmbedMm,
    kettlebellHandleHeightMm,
    kettlebellHandleLengthMm,
    kettlebellPipeOuterDiameterMm,
    kettlebellPipeWallThicknessMm,
    kettlebellHandleFilledWithConcrete,
    kettlebellSolveMode,
    kettlebellTargetMassKg,
    openingDiameterMm,
    outerDiameterCm,
    outerRingEnabled,
    outerRingThicknessMm,
    reinforcementCount,
    reinforcementDiameterMm,
    reinforcementEnabled,
    solveMode,
    targetMassKg,
    widthMm,
  ]);

  const holeRadiusM = (openingDiameterMm * MM_TO_M) / 2;
  const outerRadiusInputM = (outerDiameterCm * CM_TO_M) / 2;
  const widthInputM = widthMm * MM_TO_M;
  const innerRingThicknessM = innerRingEnabled ? innerRingThicknessMm * MM_TO_M : 0;
  const outerRingThicknessM = outerRingEnabled ? outerRingThicknessMm * MM_TO_M : 0;
  const reinforcementRadiusM = reinforcementEnabled
    ? (reinforcementDiameterMm * MM_TO_M) / 2
    : 0;

  const innerRingArea = innerRingEnabled
    ? segmentArea(holeRadiusM + innerRingThicknessM, holeRadiusM)
    : 0;
  const reinforcementBarArea = reinforcementEnabled
    ? reinforcementCount * Math.PI * reinforcementRadiusM ** 2
    : 0;
  const reinforcementStartRadiusM = holeRadiusM + innerRingThicknessM;
  const reinforcementOuterOffsetM = outerRingEnabled ? outerRingThicknessM : 0;

  let solvedWidthM = widthInputM;
  let solvedOuterRadiusM = outerRadiusInputM;
  let error = "";

  if (solveMode === "width") {
    const baseArea = segmentArea(outerRadiusInputM, holeRadiusM);
    const outerRingArea = outerRingEnabled
      ? segmentArea(outerRadiusInputM, Math.max(outerRadiusInputM - outerRingThicknessM, 0))
      : 0;
    const reinforcementLengthM = Math.max(
      outerRadiusInputM - reinforcementOuterOffsetM - reinforcementStartRadiusM,
      0,
    );
    const reinforcementMassKg =
      (STEEL_DENSITY - concreteDensity) * reinforcementBarArea * reinforcementLengthM;
    const massPerMeter =
      concreteDensity * baseArea +
      (STEEL_DENSITY - concreteDensity) * (innerRingArea + outerRingArea);

    if (massPerMeter <= 0 || targetMassKg <= reinforcementMassKg) {
      error = "The current geometry leaves no material to solve from.";
    } else {
      solvedWidthM = (targetMassKg - reinforcementMassKg) / massPerMeter;
    }
  } else {
    const alpha = concreteDensity * Math.PI * Math.max(widthInputM, 0.0001);
    const beta =
      (STEEL_DENSITY - concreteDensity) *
      (2 * Math.PI * outerRingThicknessM * Math.max(widthInputM, 0.0001) +
        reinforcementBarArea);
    const constant =
      -concreteDensity * Math.PI * holeRadiusM ** 2 * Math.max(widthInputM, 0.0001) +
      (STEEL_DENSITY - concreteDensity) *
        (innerRingArea * Math.max(widthInputM, 0.0001) -
          Math.PI * outerRingThicknessM ** 2 * Math.max(widthInputM, 0.0001) -
          reinforcementBarArea * (reinforcementOuterOffsetM + reinforcementStartRadiusM)) -
      targetMassKg;

    if (alpha <= 0) {
      error = "Concrete density must be above zero.";
    } else {
      const discriminant = beta ** 2 - 4 * alpha * constant;
      if (discriminant < 0) {
        error = "Target mass cannot be reached with this width and material setup.";
      } else {
        solvedOuterRadiusM = (-beta + Math.sqrt(discriminant)) / (2 * alpha);
      }
    }
  }

  const solvedOuterDiameterCm = (solvedOuterRadiusM / CM_TO_M) * 2;
  const activeOuterRadiusM = solveMode === "width" ? outerRadiusInputM : solvedOuterRadiusM;
  const activeWidthM = solveMode === "width" ? solvedWidthM : widthInputM;
  const activeOuterDiameterCm = solveMode === "width" ? outerDiameterCm : solvedOuterDiameterCm;
  const activeWidthMm = activeWidthM / MM_TO_M;
  const outerCircumferenceM = 2 * Math.PI * activeOuterRadiusM;
  const plateOuterDiameterMm = activeOuterDiameterCm * 10;

  if (!error && activeOuterRadiusM <= holeRadiusM) {
    error = "Outer diameter must be larger than the inner opening.";
  }

  if (!error && innerRingEnabled && holeRadiusM + innerRingThicknessM >= activeOuterRadiusM) {
    error = "The inner steel ring is too thick for the current geometry.";
  }

  if (!error && outerRingEnabled && outerRingThicknessM >= activeOuterRadiusM - holeRadiusM) {
    error = "The outer steel ring is too thick for the current geometry.";
  }

  const reinforcementLengthM = !error
    ? Math.max(activeOuterRadiusM - reinforcementOuterOffsetM - reinforcementStartRadiusM, 0)
    : 0;
  const reinforcementLengthMm = reinforcementLengthM / MM_TO_M;
  if (!error && reinforcementEnabled && reinforcementLengthM <= 0) {
    error = "There is no radial span available for the reinforcement rods.";
  }

  const activeOuterRingArea =
    !error && outerRingEnabled
      ? segmentArea(activeOuterRadiusM, activeOuterRadiusM - outerRingThicknessM)
      : 0;
  const totalShellVolumeM3 = !error
    ? segmentArea(activeOuterRadiusM, holeRadiusM) * activeWidthM
    : 0;
  const ringSteelVolumeM3 = (innerRingArea + activeOuterRingArea) * activeWidthM;
  const reinforcementVolumeM3 = reinforcementBarArea * reinforcementLengthM;
  const steelVolumeM3 = ringSteelVolumeM3 + reinforcementVolumeM3;
  const concreteVolumeM3 = Math.max(totalShellVolumeM3 - steelVolumeM3, 0);
  const steelMassKg = steelVolumeM3 * STEEL_DENSITY;
  const concreteMassKg = concreteVolumeM3 * concreteDensity;
  const totalMassKg = steelMassKg + concreteMassKg;

  if (!error && steelVolumeM3 >= totalShellVolumeM3) {
    error = "Steel parts occupy the full plate volume. Reduce steel dimensions.";
  }

  const diagramOuter = 240;
  const outerScale = !error && activeOuterRadiusM > 0 ? diagramOuter / activeOuterRadiusM : 0;
  const holeRadiusPx = holeRadiusM * outerScale;
  const outerRadiusPx = activeOuterRadiusM * outerScale;
  const innerRingOuterPx = (holeRadiusM + innerRingThicknessM) * outerScale;
  const outerRingInnerPx = (activeOuterRadiusM - outerRingThicknessM) * outerScale;
  const reinforcementStartPx = reinforcementStartRadiusM * outerScale;
  const reinforcementEndPx = (activeOuterRadiusM - reinforcementOuterOffsetM) * outerScale;
  const reinforcementStrokePx = Math.max(reinforcementRadiusM * 2 * outerScale, 2);

  const kettlebellFlattenM = kettlebellFlattenMm * MM_TO_M;
  const kettlebellHandleLengthM = kettlebellHandleLengthMm * MM_TO_M;
  const kettlebellHandleHeightM = kettlebellHandleHeightMm * MM_TO_M;
  const kettlebellHandleEmbedM = kettlebellHandleEmbedMm * MM_TO_M;
  const kettlebellPipeOuterRadiusM = (kettlebellPipeOuterDiameterMm * MM_TO_M) / 2;
  const kettlebellPipeWallM = kettlebellPipeWallThicknessMm * MM_TO_M;

  let activeKettlebellDiameterM = kettlebellDiameterMm * MM_TO_M;
  let kettlebellError = "";

  if (kettlebellSolveMode === "diameter") {
    const solved = solveKettlebellDiameterM(
      kettlebellTargetMassKg,
      kettlebellFlattenM,
      kettlebellConcreteDensity,
      kettlebellHandleLengthM,
      kettlebellHandleHeightM,
      kettlebellHandleEmbedM,
      kettlebellPipeOuterRadiusM,
      kettlebellPipeWallM,
      kettlebellHandleFilledWithConcrete,
    );

    if (solved.error) {
      kettlebellError = solved.error;
    } else {
      activeKettlebellDiameterM = solved.diameterM ?? activeKettlebellDiameterM;
    }
  }

  const kettlebellMetricsResult = computeKettlebellMetrics(
    activeKettlebellDiameterM,
    kettlebellFlattenM,
    kettlebellConcreteDensity,
    kettlebellHandleLengthM,
    kettlebellHandleHeightM,
    kettlebellHandleEmbedM,
    kettlebellPipeOuterRadiusM,
    kettlebellPipeWallM,
    kettlebellHandleFilledWithConcrete,
  );

  if (!kettlebellError && kettlebellMetricsResult.error) {
    kettlebellError = kettlebellMetricsResult.error;
  }

  const kettlebellMetrics = kettlebellMetricsResult.metrics;
  const activeKettlebellDiameterMm = activeKettlebellDiameterM / MM_TO_M;
  const activeKettlebellRadiusM = activeKettlebellDiameterM / 2;
  const activeKettlebellFlattenMm = kettlebellFlattenM / MM_TO_M;
  const activeKettlebellBaseDiameterMm =
    kettlebellMetrics && !kettlebellError ? (kettlebellMetrics.baseRadiusM / MM_TO_M) * 2 : 0;

  const kbTopPaddingPx = 72;
  const kbBottomPaddingPx = 36;
  const kbUsableHeightPx = 520 - kbTopPaddingPx - kbBottomPaddingPx;
  const kbMaxUpM = activeKettlebellRadiusM + kettlebellHandleHeightM;
  const kbMaxDownM = activeKettlebellRadiusM;
  const kbFitScaleFromHeight =
    !kettlebellError && kbMaxUpM + kbMaxDownM > 0
      ? kbUsableHeightPx / (kbMaxUpM + kbMaxDownM)
      : 0;
  const kettlebellScale =
    !kettlebellError && activeKettlebellRadiusM > 0
      ? Math.min(165 / activeKettlebellRadiusM, kbFitScaleFromHeight)
      : 0;
  const kbCx = 260;
  const kbCy = kbTopPaddingPx + kbMaxUpM * kettlebellScale;
  const kbRadiusPx = activeKettlebellRadiusM * kettlebellScale;
  const kbFlattenPx = kettlebellFlattenM * kettlebellScale;
  const kbBottomY = kbCy + kbRadiusPx - kbFlattenPx;
  const kbBaseHalfWidthPx =
    kettlebellMetrics && !kettlebellError
      ? kettlebellMetrics.baseRadiusM * kettlebellScale
      : 0;

  const kbHandleHalfSpanPx = (kettlebellHandleLengthM * kettlebellScale) / 2;
  const kbHandleRisePx = kettlebellHandleHeightM * kettlebellScale;
  const kbHandleEmbedPx = kettlebellHandleEmbedM * kettlebellScale;
  const kbTopY = kbCy - kbRadiusPx - kbHandleRisePx;
  const kbEntryY = kbCy - kbRadiusPx;
  const kbEmbedY = kbEntryY + kbHandleEmbedPx;
  const kbPipeOuterPx = (kettlebellPipeOuterDiameterMm * MM_TO_M) * kettlebellScale;
  const kbPipeInnerPx =
    Math.max(
      kettlebellPipeOuterDiameterMm - kettlebellPipeWallThicknessMm * 2,
      0,
    ) *
    MM_TO_M *
    kettlebellScale;
  const kbHandleInnerFill = kettlebellHandleFilledWithConcrete ? "#6e7f69" : "rgba(255, 252, 244, 0.9)";
  const kbRawBottomY = kbCy + kbRadiusPx;
  const kbHandleTopDimY = kbTopY - 30;
  const kbHandleLegCenterlineMm = (kettlebellHandleHeightM + kettlebellHandleEmbedM) / MM_TO_M;

  return (
    <main className="page-shell">
      <div className="tab-switch segmented" role="tablist" aria-label="Calculator type">
        <button
          className={activeTab === "plate" ? "is-active" : ""}
          onClick={() => setActiveTab("plate")}
          type="button"
          role="tab"
          aria-selected={activeTab === "plate"}
        >
          Plate
        </button>
        <button
          className={activeTab === "kettlebell" ? "is-active" : ""}
          onClick={() => setActiveTab("kettlebell")}
          type="button"
          role="tab"
          aria-selected={activeTab === "kettlebell"}
        >
          Kettlebell
        </button>
      </div>

      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">
            {activeTab === "plate" ? "Metric plate builder" : "Metric kettlebell builder"}
          </p>
          <h1>Concrete training weights calculator</h1>
          <p className="hero__lede">
            {activeTab === "plate"
              ? "Set a target mass, lock either width or diameter, and drag the sliders until the plate shape looks right."
              : "Model a flattened concrete sphere and a hollow steel upside-down square U handle, then solve diameter or read the resulting mass."}
          </p>
        </div>
        <div className="hero__stats">
          {activeTab === "plate" ? (
            <>
              <div>
                <span>Target mass</span>
                <strong>{formatKg(targetMassKg)}</strong>
              </div>
              <div>
                <span>Solved diameter</span>
                <strong>{formatCm(activeOuterDiameterCm)}</strong>
              </div>
              <div>
                <span>Solved width</span>
                <strong>{formatMm(activeWidthMm)}</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>{kettlebellSolveMode === "diameter" ? "Target mass" : "Estimated mass"}</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? formatKg(
                        kettlebellSolveMode === "diameter"
                          ? kettlebellTargetMassKg
                          : kettlebellMetrics.totalMassKg,
                      )
                    : "--"}
                </strong>
              </div>
              <div>
                <span>{kettlebellSolveMode === "diameter" ? "Solved diameter" : "Sphere diameter"}</span>
                <strong>{kettlebellError ? "--" : formatMm(activeKettlebellDiameterMm)}</strong>
              </div>
              <div>
                <span>Flat base diameter</span>
                <strong>{kettlebellError ? "--" : formatMm(activeKettlebellBaseDiameterMm)}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      {activeTab === "plate" ? (
        <section className="app-grid">
          <article className="panel controls">
            <div className="panel__header">
              <h2>Controls</h2>
              <p>Choose which dimension stays fixed, then shape the plate around it.</p>
            </div>

            <div className="segmented">
              <button
                className={solveMode === "width" ? "is-active" : ""}
                onClick={() => setSolveMode("width")}
                type="button"
              >
                Solve width
              </button>
              <button
                className={solveMode === "diameter" ? "is-active" : ""}
                onClick={() => setSolveMode("diameter")}
                type="button"
              >
                Solve diameter
              </button>
            </div>

            <Slider
              label="Target mass"
              value={targetMassKg}
              min={2}
              max={80}
              step={0.5}
              unit=" kg"
              onChange={setTargetMassKg}
            />
            <Slider
              label="Inner opening diameter"
              value={openingDiameterMm}
              min={25}
              max={80}
              step={1}
              unit=" mm"
              onChange={setOpeningDiameterMm}
            />
            <Slider
              label={solveMode === "width" ? "Outer diameter" : "Plate width"}
              value={solveMode === "width" ? outerDiameterCm : widthMm}
              min={solveMode === "width" ? 16 : 20}
              max={solveMode === "width" ? 60 : 120}
              step={solveMode === "width" ? 0.1 : 1}
              unit={solveMode === "width" ? " cm" : " mm"}
              onChange={solveMode === "width" ? setOuterDiameterCm : setWidthMm}
            />
            <Slider
              label="Concrete density"
              value={concreteDensity}
              min={2100}
              max={2600}
              step={10}
              unit=" kg/m3"
              onChange={setConcreteDensity}
            />

            <div className="toggle-card">
              <label className="toggle">
                <input
                  checked={innerRingEnabled}
                  onChange={(event) => setInnerRingEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>Inner steel ring</span>
              </label>
              {innerRingEnabled ? (
                <Slider
                  label="Inner ring wall thickness"
                  value={innerRingThicknessMm}
                  min={2}
                  max={20}
                  step={0.5}
                  unit=" mm"
                  onChange={setInnerRingThicknessMm}
                />
              ) : null}
            </div>

            <div className="toggle-card">
              <label className="toggle">
                <input
                  checked={outerRingEnabled}
                  onChange={(event) => setOuterRingEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>Outer steel ring</span>
              </label>
              {outerRingEnabled ? (
                <Slider
                  label="Outer ring wall thickness"
                  value={outerRingThicknessMm}
                  min={2}
                  max={20}
                  step={0.5}
                  unit=" mm"
                  onChange={setOuterRingThicknessMm}
                />
              ) : null}
            </div>

            <div className="toggle-card">
              <label className="toggle">
                <input
                  checked={reinforcementEnabled}
                  onChange={(event) => setReinforcementEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>Steel reinforcement rods</span>
              </label>
              {reinforcementEnabled ? (
                <>
                  <Slider
                    label="Rod count"
                    value={reinforcementCount}
                    min={2}
                    max={12}
                    step={1}
                    unit=""
                    onChange={setReinforcementCount}
                  />
                  <Slider
                    label="Rod diameter"
                    value={reinforcementDiameterMm}
                    min={4}
                    max={16}
                    step={0.5}
                    unit=" mm"
                    onChange={setReinforcementDiameterMm}
                  />
                </>
              ) : null}
              <p className="helper">
                Rods are modeled as radial steel bars running from the inner opening or inner
                ring to the outer edge or outer ring.
              </p>
            </div>
          </article>

          <article className="panel results">
            <div className="panel__header">
              <h2>Result</h2>
              <p>Live geometry, material split, and a cross-section view.</p>
            </div>

            {error ? <div className="alert">{error}</div> : null}

            <div className="result-grid">
              <div className="result-card">
                <span>Outer diameter</span>
                <strong>{formatCm(activeOuterDiameterCm)}</strong>
              </div>
              <div className="result-card">
                <span>Plate width</span>
                <strong>{formatMm(activeWidthMm)}</strong>
              </div>
              <div className="result-card">
                <span>Outer circumference</span>
                <strong>{formatMeters(outerCircumferenceM)}</strong>
              </div>
              <div className="result-card">
                <span>Reinforcement rod length</span>
                <strong>{reinforcementEnabled ? formatMm(reinforcementLengthMm) : "Not used"}</strong>
              </div>
              <div className="result-card">
                <span>Total mass</span>
                <strong>{formatKg(totalMassKg)}</strong>
              </div>
              <div className="result-card">
                <span>Steel share</span>
                <strong>
                  {totalMassKg > 0 ? round((steelMassKg / totalMassKg) * 100, 1).toFixed(1) : "0.0"}
                  %
                </strong>
              </div>
            </div>

            <div className="mass-stack">
              <div>
                <span>Concrete mass</span>
                <strong>{formatKg(concreteMassKg)}</strong>
              </div>
              <div>
                <span>Steel mass</span>
                <strong>{formatKg(steelMassKg)}</strong>
              </div>
              <div>
                <span>Concrete volume</span>
                <strong>{round(concreteVolumeM3 * KG_TO_G, 2).toFixed(2)} L</strong>
              </div>
              <div>
                <span>Steel volume</span>
                <strong>{round(steelVolumeM3 * KG_TO_G, 2).toFixed(2)} L</strong>
              </div>
            </div>

            <div className="diagram">
              <svg aria-label="Weight plate cross-section" viewBox="0 0 520 520" role="img">
                <defs>
                  <marker
                    id="plate-arrow"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto-start-reverse"
                    refX="5"
                    refY="3"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#2b3f32" />
                  </marker>
                </defs>
                <rect fill="transparent" height="520" width="520" x="0" y="0" />
                <circle cx="260" cy="260" fill="#6e7f69" r={outerRadiusPx} />
                {outerRingEnabled && !error ? (
                  <circle
                    cx="260"
                    cy="260"
                    fill="none"
                    r={(outerRadiusPx + outerRingInnerPx) / 2}
                    stroke="#cad5c2"
                    strokeWidth={Math.max(outerRadiusPx - outerRingInnerPx, 1)}
                  />
                ) : null}
                <circle cx="260" cy="260" fill="#152018" r={holeRadiusPx} />
                {innerRingEnabled && !error ? (
                  <circle
                    cx="260"
                    cy="260"
                    fill="none"
                    r={(holeRadiusPx + innerRingOuterPx) / 2}
                    stroke="#d3ddcb"
                    strokeWidth={Math.max(innerRingOuterPx - holeRadiusPx, 1)}
                  />
                ) : null}
                {reinforcementEnabled && !error
                  ? Array.from({ length: reinforcementCount }, (_, index) => {
                      const angle = (index / reinforcementCount) * Math.PI * 2;
                      return (
                        <line
                          key={angle}
                          stroke="#f18f01"
                          strokeLinecap="round"
                          strokeWidth={reinforcementStrokePx}
                          x1={260 + Math.cos(angle) * reinforcementStartPx}
                          x2={260 + Math.cos(angle) * reinforcementEndPx}
                          y1={260 + Math.sin(angle) * reinforcementStartPx}
                          y2={260 + Math.sin(angle) * reinforcementEndPx}
                        />
                      );
                    })
                  : null}
                {reinforcementEnabled && !error
                  ? Array.from({ length: reinforcementCount }, (_, index) => {
                      const angle = (index / reinforcementCount) * Math.PI * 2;
                      return (
                        <circle
                          cx={260 + Math.cos(angle) * reinforcementStartPx}
                          cy={260 + Math.sin(angle) * reinforcementStartPx}
                          fill="#f18f01"
                          key={angle}
                          r={reinforcementStrokePx / 2}
                        />
                      );
                    })
                  : null}
                {!error ? (
                  <>
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={260 - outerRadiusPx}
                      x2={260 - outerRadiusPx}
                      y1={260}
                      y2={74}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={260 + outerRadiusPx}
                      x2={260 + outerRadiusPx}
                      y1={260}
                      y2={74}
                    />
                    <line
                      markerEnd="url(#plate-arrow)"
                      markerStart="url(#plate-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1={260 - outerRadiusPx}
                      x2={260 + outerRadiusPx}
                      y1={74}
                      y2={74}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="14"
                      textAnchor="middle"
                      x="260"
                      y="66"
                    >
                      {formatMm(plateOuterDiameterMm)}
                    </text>

                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={260 - holeRadiusPx}
                      x2={260 - holeRadiusPx}
                      y1={260}
                      y2={446}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={260 + holeRadiusPx}
                      x2={260 + holeRadiusPx}
                      y1={260}
                      y2={446}
                    />
                    <line
                      markerEnd="url(#plate-arrow)"
                      markerStart="url(#plate-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1={260 - holeRadiusPx}
                      x2={260 + holeRadiusPx}
                      y1={446}
                      y2={446}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="14"
                      textAnchor="middle"
                      x="260"
                      y="465"
                    >
                      {formatMm(openingDiameterMm)}
                    </text>
                  </>
                ) : null}
              </svg>
            </div>

            <div className="formula">
              <p>
                Concrete is treated as an annular cylinder. Steel rings run through the plate
                width, while reinforcement bars are modeled as radial rods in the plate face.
              </p>
              <p>
                Densities in use: {concreteDensity} kg/m3 concrete, {STEEL_DENSITY} kg/m3 steel.
              </p>
            </div>
          </article>
        </section>
      ) : (
        <section className="app-grid">
          <article className="panel controls">
            <div className="panel__header">
              <h2>Controls</h2>
              <p>
                Configure a flattened concrete sphere plus a hollow steel square-U handle made
                from round pipe.
              </p>
            </div>

            <div className="segmented">
              <button
                className={kettlebellSolveMode === "diameter" ? "is-active" : ""}
                onClick={() => setKettlebellSolveMode("diameter")}
                type="button"
              >
                Solve diameter
              </button>
              <button
                className={kettlebellSolveMode === "mass" ? "is-active" : ""}
                onClick={() => setKettlebellSolveMode("mass")}
                type="button"
              >
                Estimate mass
              </button>
            </div>

            {kettlebellSolveMode === "diameter" ? (
              <Slider
                label="Target mass"
                value={kettlebellTargetMassKg}
                min={2}
                max={80}
                step={0.5}
                unit=" kg"
                onChange={setKettlebellTargetMassKg}
              />
            ) : (
              <Slider
                label="Sphere diameter"
                value={kettlebellDiameterMm}
                min={90}
                max={420}
                step={1}
                unit=" mm"
                onChange={setKettlebellDiameterMm}
              />
            )}
            <Slider
              label="Flatten amount"
              value={kettlebellFlattenMm}
              min={0}
              max={120}
              step={1}
              unit=" mm"
              onChange={setKettlebellFlattenMm}
            />
            <Slider
              label="Concrete density"
              value={kettlebellConcreteDensity}
              min={2100}
              max={2600}
              step={10}
              unit=" kg/m3"
              onChange={setKettlebellConcreteDensity}
            />

            <div className="toggle-card">
              <p className="helper">
                Handle geometry (upside-down square U made from hollow round steel pipe).
              </p>
              <label className="toggle">
                <input
                  checked={kettlebellHandleFilledWithConcrete}
                  onChange={(event) =>
                    setKettlebellHandleFilledWithConcrete(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>Fill handle with concrete</span>
              </label>
              <Slider
                label="Top handle length"
                value={kettlebellHandleLengthMm}
                min={80}
                max={240}
                step={1}
                unit=" mm"
                onChange={setKettlebellHandleLengthMm}
              />
              <Slider
                label="Handle rise above sphere"
                value={kettlebellHandleHeightMm}
                min={25}
                max={180}
                step={1}
                unit=" mm"
                onChange={setKettlebellHandleHeightMm}
              />
              <Slider
                label="Leg embed depth"
                value={kettlebellHandleEmbedMm}
                min={5}
                max={130}
                step={1}
                unit=" mm"
                onChange={setKettlebellHandleEmbedMm}
              />
              <Slider
                label="Pipe outer diameter"
                value={kettlebellPipeOuterDiameterMm}
                min={16}
                max={50}
                step={0.5}
                unit=" mm"
                onChange={setKettlebellPipeOuterDiameterMm}
              />
              <Slider
                label="Steel wall thickness"
                value={kettlebellPipeWallThicknessMm}
                min={1}
                max={8}
                step={0.1}
                unit=" mm"
                onChange={setKettlebellPipeWallThicknessMm}
              />
            </div>
          </article>

          <article className="panel results">
            <div className="panel__header">
              <h2>Result</h2>
              <p>Mass split, flattened geometry, and a side-view schematic.</p>
            </div>

            {kettlebellError ? <div className="alert">{kettlebellError}</div> : null}

            <div className="result-grid">
              <div className="result-card">
                <span>{kettlebellSolveMode === "diameter" ? "Solved diameter" : "Sphere diameter"}</span>
                <strong>{kettlebellError ? "--" : formatMm(activeKettlebellDiameterMm)}</strong>
              </div>
              <div className="result-card">
                <span>Flatten amount</span>
                <strong>{formatMm(activeKettlebellFlattenMm)}</strong>
              </div>
              <div className="result-card">
                <span>Flat base diameter</span>
                <strong>{kettlebellError ? "--" : formatMm(activeKettlebellBaseDiameterMm)}</strong>
              </div>
              <div className="result-card">
                <span>Handle centerline length</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? formatMm(kettlebellMetrics.handleLengthM / MM_TO_M)
                    : "--"}
                </strong>
              </div>
              <div className="result-card">
                <span>Total mass</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? formatKg(kettlebellMetrics.totalMassKg)
                    : "--"}
                </strong>
              </div>
              <div className="result-card">
                <span>Steel share</span>
                <strong>
                  {kettlebellMetrics && kettlebellMetrics.totalMassKg > 0 && !kettlebellError
                    ? `${round((kettlebellMetrics.steelMassKg / kettlebellMetrics.totalMassKg) * 100, 1).toFixed(1)}%`
                    : "--"}
                </strong>
              </div>
            </div>

            <div className="mass-stack">
              <div>
                <span>Concrete mass</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? formatKg(kettlebellMetrics.concreteMassKg)
                    : "--"}
                </strong>
              </div>
              <div>
                <span>Steel mass</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? formatKg(kettlebellMetrics.steelMassKg)
                    : "--"}
                </strong>
              </div>
              <div>
                <span>Concrete volume</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? `${round(kettlebellMetrics.concreteVolumeM3 * KG_TO_G, 2).toFixed(2)} L`
                    : "--"}
                </strong>
              </div>
              <div>
                <span>Steel volume</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? `${round(kettlebellMetrics.steelVolumeM3 * KG_TO_G, 2).toFixed(2)} L`
                    : "--"}
                </strong>
              </div>
              <div>
                <span>Concrete in handle</span>
                <strong>
                  {kettlebellMetrics && !kettlebellError
                    ? `${round(kettlebellMetrics.concreteInHandleVolumeM3 * KG_TO_G, 2).toFixed(2)} L`
                    : "--"}
                </strong>
              </div>
            </div>

            <div className="diagram">
              <svg aria-label="Kettlebell side profile" viewBox="0 0 520 520" role="img">
                <defs>
                  <marker
                    id="kb-arrow"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto-start-reverse"
                    refX="5"
                    refY="3"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#2b3f32" />
                  </marker>
                </defs>
                <rect fill="transparent" height="520" width="520" x="0" y="0" />
                <circle cx={kbCx} cy={kbCy} fill="#6e7f69" r={kbRadiusPx} />
                <rect
                  fill="rgba(255, 252, 244, 0.92)"
                  height={Math.max(520 - kbBottomY, 0)}
                  width="520"
                  x="0"
                  y={kbBottomY}
                />
                <line
                  stroke="#536a58"
                  strokeLinecap="round"
                  strokeWidth="8"
                  x1={kbCx - kbBaseHalfWidthPx}
                  x2={kbCx + kbBaseHalfWidthPx}
                  y1={kbBottomY}
                  y2={kbBottomY}
                />

                <line
                  stroke="#98a7af"
                  strokeLinecap="round"
                  strokeWidth={Math.max(kbPipeOuterPx, 2)}
                  x1={kbCx - kbHandleHalfSpanPx}
                  x2={kbCx + kbHandleHalfSpanPx}
                  y1={kbTopY}
                  y2={kbTopY}
                />
                <line
                  stroke="#98a7af"
                  strokeLinecap="butt"
                  strokeWidth={Math.max(kbPipeOuterPx, 2)}
                  x1={kbCx - kbHandleHalfSpanPx}
                  x2={kbCx - kbHandleHalfSpanPx}
                  y1={kbTopY}
                  y2={kbEmbedY}
                />
                <line
                  stroke="#98a7af"
                  strokeLinecap="butt"
                  strokeWidth={Math.max(kbPipeOuterPx, 2)}
                  x1={kbCx + kbHandleHalfSpanPx}
                  x2={kbCx + kbHandleHalfSpanPx}
                  y1={kbTopY}
                  y2={kbEmbedY}
                />
                {kbPipeInnerPx > 0 ? (
                  <>
                    <line
                      stroke={kbHandleInnerFill}
                      strokeLinecap="round"
                      strokeWidth={Math.max(kbPipeInnerPx, 1)}
                      x1={kbCx - kbHandleHalfSpanPx}
                      x2={kbCx + kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbTopY}
                    />
                    <line
                      stroke={kbHandleInnerFill}
                      strokeLinecap="butt"
                      strokeWidth={Math.max(kbPipeInnerPx, 1)}
                      x1={kbCx - kbHandleHalfSpanPx}
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbEmbedY}
                    />
                    <line
                      stroke={kbHandleInnerFill}
                      strokeLinecap="butt"
                      strokeWidth={Math.max(kbPipeInnerPx, 1)}
                      x1={kbCx + kbHandleHalfSpanPx}
                      x2={kbCx + kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbEmbedY}
                    />
                  </>
                ) : null}
                {!kettlebellError ? (
                  <>
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={kbCx - kbRadiusPx}
                      x2={kbCx - kbRadiusPx}
                      y1={kbCy}
                      y2="458"
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={kbCx + kbRadiusPx}
                      x2={kbCx + kbRadiusPx}
                      y1={kbCy}
                      y2="458"
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1={kbCx - kbRadiusPx}
                      x2={kbCx + kbRadiusPx}
                      y1="458"
                      y2="458"
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="14"
                      textAnchor="middle"
                      x={kbCx}
                      y="478"
                    >
                      {formatMm(activeKettlebellDiameterMm)}
                    </text>

                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={kbCx - kbHandleHalfSpanPx}
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbHandleTopDimY}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1={kbCx + kbHandleHalfSpanPx}
                      x2={kbCx + kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbHandleTopDimY}
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1={kbCx - kbHandleHalfSpanPx}
                      x2={kbCx + kbHandleHalfSpanPx}
                      y1={kbHandleTopDimY}
                      y2={kbHandleTopDimY}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="14"
                      textAnchor="middle"
                      x={kbCx}
                      y={kbHandleTopDimY - 8}
                    >
                      {formatMm(kettlebellHandleLengthMm)}
                    </text>

                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="72"
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbTopY}
                      y2={kbTopY}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="72"
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbEntryY}
                      y2={kbEntryY}
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1="72"
                      x2="72"
                      y1={kbTopY}
                      y2={kbEntryY}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="12"
                      textAnchor="start"
                      x="12"
                      y={(kbTopY + kbEntryY) / 2 - 2}
                    >
                      {formatMm(kettlebellHandleHeightMm)}
                    </text>

                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="72"
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbEntryY}
                      y2={kbEntryY}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="72"
                      x2={kbCx - kbHandleHalfSpanPx}
                      y1={kbEmbedY}
                      y2={kbEmbedY}
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1="72"
                      x2="72"
                      y1={kbEntryY}
                      y2={kbEmbedY}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="12"
                      textAnchor="start"
                      x="8"
                      y={(kbEntryY + kbEmbedY) / 2 + 4}
                    >
                      {formatMm(kettlebellHandleEmbedMm)}
                    </text>

                    <line
                      stroke="#1f4a3a"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                      x1={kbCx + kbHandleHalfSpanPx}
                      x2="474"
                      y1={kbTopY}
                      y2={kbTopY}
                    />
                    <line
                      stroke="#1f4a3a"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                      x1={kbCx + kbHandleHalfSpanPx}
                      x2="474"
                      y1={kbEmbedY}
                      y2={kbEmbedY}
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#1f4a3a"
                      strokeWidth="2"
                      x1="474"
                      x2="474"
                      y1={kbTopY}
                      y2={kbEmbedY}
                    />
                    <text
                      fill="#1f4a3a"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="11"
                      textAnchor="end"
                      x="468"
                      y={(kbTopY + kbEmbedY) / 2 + 2}
                    >
                      {formatMm(kbHandleLegCenterlineMm)}
                    </text>

                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="450"
                      x2={kbCx + kbRadiusPx}
                      y1={kbRawBottomY}
                      y2={kbRawBottomY}
                    />
                    <line
                      stroke="#2b3f32"
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      x1="450"
                      x2={kbCx + kbRadiusPx}
                      y1={kbBottomY}
                      y2={kbBottomY}
                    />
                    <line
                      markerEnd="url(#kb-arrow)"
                      markerStart="url(#kb-arrow)"
                      stroke="#2b3f32"
                      strokeWidth="2"
                      x1="450"
                      x2="450"
                      y1={kbRawBottomY}
                      y2={kbBottomY}
                    />
                    <text
                      fill="#1e2f24"
                      fontFamily="var(--font-mono), monospace"
                      fontSize="14"
                      textAnchor="start"
                      x="458"
                      y={(kbRawBottomY + kbBottomY) / 2 + 4}
                    >
                      {formatMm(activeKettlebellFlattenMm)}
                    </text>
                  </>
                ) : null}
              </svg>
            </div>

            <div className="formula">
              <p>
                Concrete body: sphere volume minus a bottom spherical cap (flatten). Embedded leg
                volume is removed from concrete, and pipe interior can optionally be concrete-filled.
              </p>
              <p>
                Handle steel: hollow round-pipe area multiplied by square-U centerline length. In
                use: {kettlebellConcreteDensity} kg/m3 concrete, {STEEL_DENSITY} kg/m3 steel.
              </p>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
