const setsMatrix = {
  beginner: { easy: 2, moderate: 2, hard: 3 },
  intermediate: { easy: 2, moderate: 3, hard: 4 },
  advanced: { easy: 3, moderate: 4, hard: 5 },
};

const goalConfig = {
  strength: { reps: 5, rest: 240, rir: 2 },
  muscle_gain: { reps: 10, rest: 180, rir: 2 },
  endurance: { reps: 15, rest: 60, rir: 4 },
  weight_loss: { reps: 12, rest: 60, rir: 3 },
  general_fitness: { reps: 8, rest: 120, rir: 3 },
};

// ── Intensity adjusts RIR ─────────────────────────────────
// Easy     → +1 RIR (less effort, more in reserve)
// Moderate → ±0 RIR
// Hard     → -1 RIR (push closer to failure)
const intensityRirAdjust = { easy: 1, moderate: 0, hard: -1 };

const createDefaultSets = (
  intensity = "moderate",
  goal = "general_fitness",
  experience = "intermediate",
) => {
  const numSets =
    (setsMatrix[experience] || setsMatrix.intermediate)[intensity] || 3;

  const {
    reps,
    rest,
    rir: baseRir,
  } = goalConfig[goal] || goalConfig.general_fitness;

  const finalRir = Math.max(0, baseRir + (intensityRirAdjust[intensity] || 0));

  // ── Warmups — count depends on experience ────────────
  // Advanced = 2 warm-up sets, everyone else = 3
  const warmups =
    experience === "advanced"
      ? [
          {
            setNumber: 1,
            type: "warmup",
            weight: 0,
            unit: "LB",
            reps: 4,
            restSeconds: 60,
            rir: null,
          },
          {
            setNumber: 2,
            type: "warmup",
            weight: 0,
            unit: "LB",
            reps: 4,
            restSeconds: 120,
            rir: null,
          },
        ]
      : [
          {
            setNumber: 1,
            type: "warmup",
            weight: 0,
            unit: "LB",
            reps: 4,
            restSeconds: 60,
            rir: null,
          },
          {
            setNumber: 2,
            type: "warmup",
            weight: 0,
            unit: "LB",
            reps: 4,
            restSeconds: 60,
            rir: null,
          },
          {
            setNumber: 3,
            type: "warmup",
            weight: 0,
            unit: "LB",
            reps: 4,
            restSeconds: 120,
            rir: null,
          },
        ];

  // ── Working sets ──────────────────────────────────────
  const working = Array.from({ length: numSets }, (_, i) => ({
    setNumber: i + 1,
    type: "working",
    weight: 0,
    unit: "LB",
    reps,
    restSeconds: rest,
    rir: finalRir,
  }));

  return [...warmups, ...working];
};

// ── Exports ───────────────────────────────────────────────
// Export shared config so other modules (e.g. viewController)
// can reuse without duplicating the source of truth
module.exports = createDefaultSets;
module.exports.setsMatrix = setsMatrix;
module.exports.goalConfig = goalConfig;
module.exports.intensityRirAdjust = intensityRirAdjust;
