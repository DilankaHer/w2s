import { InferInsertModel } from 'drizzle-orm';
import { db } from './database';
import {
  bodyParts,
  equipment,
  exercises,
  workouts,
  workoutExercises,
  sets,
} from './schema/schemas';
import * as crypto from "expo-crypto";

const now = () => new Date().toISOString();

export async function seed() {
  console.log('🌱 Seeding local SQLite database...');

  // Clear tables (order matters due to FKs)
  await db.delete(sets);
  await db.delete(workoutExercises);
  await db.delete(exercises);
  await db.delete(workouts);
  await db.delete(bodyParts);
  await db.delete(equipment);

  console.log('Cleared tables');

  //
  // BODY PARTS
  //
  const bodyPartData = [
    'Legs',
    'Chest',
    'Back',
    'Shoulders',
    'Arms',
    'Core',
    'Glutes',
    'Neck',
  ].map(name => ({
    id: crypto.randomUUID(),
    name,
  }));

  await db.insert(bodyParts).values(bodyPartData);

  console.log('Inserted body parts');

  //
  // EQUIPMENT
  //
  const equipmentData = [
    'Barbell-Standard',
    'Barbell-Olympic',
    'Barbell-Powerlifting',
    'Safety squat bar',
    'EZ curl bar',
    'Cambered bar',
    'Trap bar',
    'Pull-up bar',
    'Dip bar',
    'Dumbbell',
    'Kettlebell',
    'Cable',
    'Machine',
    'Bodyweight',
    'Resistance band',
    'Plate',
    'Other',
  ].map(name => ({
    id: crypto.randomUUID(),
    name,
  }));

  await db.insert(equipment).values(equipmentData);
  console.log('Inserted equipment');

  // Lookup maps
  const bp = Object.fromEntries(bodyPartData.map(b => [b.name, b.id]));
  const eq = Object.fromEntries(equipmentData.map(e => [e.name, e.id]));

  //
  // EXERCISES
  //
  const exerciseList = [
    {
      name: 'Squat',
      bodyPartId: bp['Legs'],
      equipmentId: eq['Barbell-Standard'],
      link: 'https://youtube.com/shorts/PPmvh7gBTi0',
      isDefaultExercise: true,
      info: [
        "Bar placement: high bar on upper traps (more quads) or low bar 2–3 inches lower (more glutes/low back)",
        "Walk-out: 1 step clear, 2nd to match feet, 3rd only if needed",
        "Stance: just outside shoulder width, toes slightly flared",
        "Depth: break parallel; heels on a plate to make itn easier",
        "Bar path: straight line over mid-foot, keep balanced"
      ],
    },
    {
      name: 'Bench Press - Flat',
      bodyPartId: bp['Chest'],
      equipmentId: eq['Barbell-Standard'],
      link: 'https://youtube.com/shorts/hWbUlkb5Ms4',
      isDefaultExercise: true,
      info: [
        "Arch: Slight curve in upper back — tuck shoulder blades, chest up. For powerlifting use a bigger arch; keep feet, glutes, upper back, and head planted.",
        "Grip: About 1.5× shoulder width, squeeze the bar hard. Wider grip = more chest; closer grip = more triceps.",
        "Unrack: Press the bar up and arc it forward with locked elbows until your arms are straight up.",
        "Elbows: Tuck slightly inward so they travel at roughly a 45° angle on the way down.",
        "Bar path: Lower down and slightly forward, light touch on lower chest (no bounce). Press up and slightly back and drive your feet into the floor."
      ],
    },
    {
      name: 'Deadlift',
      bodyPartId: bp['Back'],
      equipmentId: eq['Barbell-Standard'],
      link: 'https://youtube.com/shorts/ZaTM37cfiDs',
      isDefaultExercise: true,
      info: [
        "Stance: Shins about one inch from the bar, feet hip-width, toes slightly out. Bar over the middle of your foot.",
        "Grip: Hinge at the hips with nearly straight knees (no squatting). Grip just outside your shins — over/under, hook, or strapped. Shins on the bar, pointing straight up.",
        "Pull the slack out: Take the slack out gradually; don't yank the bar.",
        "Pull: Chest up and drive hips forward, keeping the bar in contact with your legs.",
        "Lockout: Stand up straight, chest up. Don't shrug or over-squeeze your back.",
        "Lower: Set hips back and bend knees, bar close to your body so it lands over the middle of your foot."
      ],
    },
    {
      name: 'Overhead Press',
      bodyPartId: bp['Shoulders'],
      equipmentId: eq['Barbell-Standard'],
      isDefaultExercise: true,
      info: [],
    },
    {
      name: 'Barbell Row',
      bodyPartId: bp['Back'],
      equipmentId: eq['Barbell-Standard'],
      link: "https://www.youtube.com/shorts/Nqh7q3zDCoQ",
      isDefaultExercise: true,
      info: [
        "Set the bar around knee height and grip it with a wide overhand grip.",
        "Stabilize: feet hip-width, pelvis level, core engaged.",
        "Push hips back and slide the bar along your thighs until it passes your knees.",
        "Pull the bar to your stomach by driving the elbows back, elbows out to about 45°, and squeeze your shoulder blades.",
        "Lower under control and stretch your back by letting your shoulder blades open until your arms are fully extended."
      ],
    },
    {
      name: 'Pull-ups',
      bodyPartId: bp['Back'],
      equipmentId: eq['Pull-up bar'],
      link: "https://www.youtube.com/shorts/ZPG8OsHKXLw",
      isDefaultExercise: true,
      info: [
        "Grip: Stand on a bench, arms bent to 90°, grab the bar with an overhand grip and thumb over the bar for better back activation.",
        "Setup: Step off the bench slowly, straighten your legs by flexing your quads, and brace your core to bring your feet forward.",
        "Mid-back: Before pulling, set your mid-back by keeping arms straight and pulling your shoulder blades down into your back pockets.",
        "Pull: Drive your elbows down with your lats and upper back; pull until your chest is to the bar and your chin is above it.",
        "Lower: Lower under control until your arms are almost fully straight, then start the next rep."
      ],
    },
    {
      name: 'Dips-Chest',
      bodyPartId: bp['Chest'],
      equipmentId: eq['Dip bar'],
      link: "https://www.youtube.com/shorts/CrbIq-T-h8I",
      isDefaultExercise: true,
      info: [
        "Start at the top: arms straight, shoulders down, slight external rotation. Neutral or slightly rounded spine, glutes on, legs straight.",
        "Begin the dip: Lean slightly forward, bend the elbows, let spine and hips flex. Shoulder blades neutral or retracted.",
        "Descent: Go to at least 90° or lower if mobility allows. Keep forearms as vertical as you can and stay tight at the bottom.",
        "Ascent: Push back up and lean back into the top support position."
      ],
    },
    {
      name: 'Push-ups',
      bodyPartId: bp['Chest'],
      equipmentId: eq['Bodyweight'],
      link: "https://youtube.com/shorts/c-lBErfxszs?si=6UHHFVAbUZ-QW64y",
      isDefaultExercise: true,
      info: [
        "Start on your knees with your hands slightly wider than shoulder-width.",
        "Rock forward so your shoulders are over your hands, then come up onto your toes.",
        "Take a breath in and brace your abs to flatten your lower back.",
        "Lower your whole body as one until your chest touches the floor, then press to a full lockout.",
        "Tuck your arms for comfort and adjust hand width so your forearms are vertical at the bottom.",
        "To make it easier, do push-ups from your knees — that’s a valid option."
      ],
    },
    {
      name: 'Bicep Curls',
      bodyPartId: bp['Arms'],
      equipmentId: eq['Dumbbell'],
      link: "https://www.youtube.com/shorts/2jpteC44QKg",
      isDefaultExercise: true,
      info: [
        "Roll your shoulders back.",
        "Squeeze your glutes.",
        "Keep your elbows pinned by your sides.",
        "Curl the weight up to your chest.",
        "Squeeze at the top of the movement."
      ],
    },
    {
      name: 'Leg Press',
      bodyPartId: bp['Legs'],
      equipmentId: eq['Machine'],
      link: "https://www.youtube.com/shorts/nDh_BlnLCGc",
      isDefaultExercise: true,
      info: [
        "Foot position: Higher feet = more glutes; lower feet = more quads. Shoulder-width stance with toes slightly out is a good default.",
        "Controlled negative: Resist the weight on the way down instead of letting it drop to get a better quad stretch.",
        "Depth: Go as deep as you comfortably can for quad and glute growth. If the sled hits the end, use a pad or lighter weight to get more range.",
        "Grip: Hold the handles firmly and pull up on them to keep your glutes on the seat.",
        "Lockout: You can lock out your knees, but avoid snapping them; a very slight bend at the top is fine."
      ],
    },
  ];

  const exerciseRows = exerciseList.map(ex => ({
    id: crypto.randomUUID(),
    name: ex.name,
    link: ex.link ?? null,
    info: JSON.stringify(ex.info),
    imageName: null,
    bodyPartId: ex.bodyPartId,
    equipmentId: ex.equipmentId,
    isDefaultExercise: ex.isDefaultExercise,
  }));

  await db.insert(exercises).values(exerciseRows);
  console.log('Inserted exercises');

  const exMap = Object.fromEntries(
    exerciseRows.map(e => [e.name, e.id])
  );

  //
  // WORKOUTS
  //
  const fullBodyId = crypto.randomUUID();
  const upperBodyId = crypto.randomUUID();

  await db.insert(workouts).values([
    {
      id: fullBodyId,
      name: 'Full Body Beginner',
      isDefaultWorkout: true,
      exerciseCount: 5,
      setCount: 15,
      createdAt: now(),
    },
    {
      id: upperBodyId,
      name: 'Upper Body Focus',
      isDefaultWorkout: true,
      exerciseCount: 3,
      setCount: 9,
      createdAt: now(),
    },
  ]);

  //
  // WORKOUT EXERCISES
  //
  const workoutExercisesList: InferInsertModel<typeof workoutExercises>[] = [];

  const fullBodyOrder = [
    'Squat',
    'Bench Press - Flat',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
  ];

  fullBodyOrder.forEach((name, index) => {
    workoutExercisesList.push({
      id: crypto.randomUUID(),
      workoutId: fullBodyId,
      exerciseId: exMap[name],
      order: index + 1,
    });
  });

  const upperBodyOrder = [
    'Bench Press - Flat',
    'Overhead Press',
    'Barbell Row',
  ];

  upperBodyOrder.forEach((name, index) => {
    workoutExercisesList.push({
      id: crypto.randomUUID(),
      workoutId: upperBodyId,
      exerciseId: exMap[name],
      order: index + 1,
    });
  });

  await db.insert(workoutExercises).values(workoutExercisesList);
  console.log('Inserted workout exercises');

  //
  // SETS
  //
  const setsRows: InferInsertModel<typeof sets>[] = [];

  workoutExercisesList.forEach(te => {
    const isFullBody = te.workoutId === fullBodyId;

    const repScheme = isFullBody ? 10 : 8;
    const weight = 135;

    for (let i = 0; i < 3; i++) {
      setsRows.push({
        id: crypto.randomUUID(),
        workoutExerciseId: te.id,
        setNumber: i + 1,
        targetReps: repScheme,
        targetWeight: weight,
      });
    }
  });

  await db.insert(sets).values(setsRows);

  console.log('✅ Seed complete');
}