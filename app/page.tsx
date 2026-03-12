"use client";

import { useEffect, useState } from "react";

type SolveMode = "width" | "diameter";

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

export default function Home() {
  const [hasLoadedSavedControls, setHasLoadedSavedControls] = useState(false);
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

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(STORAGE_KEY);
      if (!savedValue) {
        setHasLoadedSavedControls(true);
        return;
      }

      const parsed = JSON.parse(savedValue) as Partial<PersistedControls>;

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
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  }, [
    concreteDensity,
    hasLoadedSavedControls,
    innerRingEnabled,
    innerRingThicknessMm,
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

  const solvedOuterDiameterCm = solvedOuterRadiusM / CM_TO_M * 2;
  const activeOuterRadiusM = solveMode === "width" ? outerRadiusInputM : solvedOuterRadiusM;
  const activeWidthM = solveMode === "width" ? solvedWidthM : widthInputM;
  const activeOuterDiameterCm = solveMode === "width" ? outerDiameterCm : solvedOuterDiameterCm;
  const activeWidthMm = activeWidthM / MM_TO_M;
  const outerCircumferenceM = 2 * Math.PI * activeOuterRadiusM;

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

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Metric plate builder</p>
          <h1>Concrete training weights calculator</h1>
          <p className="hero__lede">
            Set a target mass, lock either width or diameter, and drag the sliders
            until the plate shape looks right. The remaining dimension is solved live.
          </p>
        </div>
        <div className="hero__stats">
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
        </div>
      </section>

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
            <svg
              aria-label="Weight plate cross-section"
              viewBox="0 0 520 520"
              role="img"
            >
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
    </main>
  );
}
