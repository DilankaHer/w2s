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
    { id: '7c0a98eb-886c-4ef1-91f4-32473db54afe', name: 'Legs' },
    { id: 'e3886932-8f36-4f2b-91e9-89182dee39a2', name: 'Chest' },
    { id: '274b778b-e135-4fdf-a974-59171cddf1ff', name: 'Back' },
    { id: 'eaf82df5-ad0a-47cc-b783-ee47e0340f68', name: 'Shoulders' },
    { id: '3dfdd8db-20bb-4195-b32f-77cc39b9397e', name: 'Arms' },
    { id: 'cfdfec00-0212-479c-b8f7-813e14e5d698', name: 'Core' },
    { id: '658478a6-0d62-4ad7-b4d7-88ae545fe31f', name: 'Glutes' },
    { id: '5d9f61ea-daf3-4f6c-b00e-2ece9f28f293', name: 'Neck' },
  ];

  await db.insert(bodyParts).values(bodyPartData);

  console.log('Inserted body parts');

  //
  // EQUIPMENT
  //
  const equipmentData = [
    { id: 'b4fd9a88-c0a7-4959-9f25-cbfded1c7046', name: 'Barbell-Standard' },
    { id: 'e0f615ff-d505-4fda-a04d-a23050159e99', name: 'Barbell-Olympic' },
    { id: '23527f22-1b73-4ad4-9823-018eee2c08b1', name: 'Barbell-Powerlifting' },
    { id: '7e9ad40a-3967-434a-b3cc-80511220457e', name: 'Safety squat bar' },
    { id: '967e6db9-7ce4-4da7-a617-fbe83a60b815', name: 'EZ curl bar' },
    { id: 'b5739d5a-09c9-4b15-a5df-d4fd9d028bab', name: 'Cambered bar' },
    { id: '0fb6c780-b4fe-40ad-a0d5-f13d758b8bbb', name: 'Trap bar' },
    { id: '6c82c018-9b19-47ec-9c1e-24bd61979252', name: 'Pull-up bar' },
    { id: 'fc1d8304-8b5c-4b7b-a6d2-5510b137fad3', name: 'Dip bar' },
    { id: '3af7b6b9-96fe-4a95-9c38-993165647ee2', name: 'Dumbbell' },
    { id: '3ad5853a-61e2-4fe3-9fc6-e456fc997723', name: 'Kettlebell' },
    { id: '335e1bd6-8788-4732-bbb0-db554755355e', name: 'Cable' },
    { id: '15aec9d2-e9d5-4510-83d1-b654c190fd85', name: 'Machine' },
    { id: 'afb99cc2-ad50-415e-9b9c-f7a041044c2e', name: 'Bodyweight' },
    { id: '155d1a7c-6097-4065-ad6b-1a5cb9bcbf5d', name: 'Resistance band' },
    { id: 'b12c8be4-8c52-4e05-8348-f3a44df8fcfd', name: 'Plate' },
    { id: 'fd8b6d53-ce86-4afb-8d85-a17c52cf163b', name: 'Other' },
  ];
  
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
      id: '8a2d1eb0-cb08-4c72-be54-fc81ce22b0aa',
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
      isSynced: true
    },
    {
      id: '0f9cdaff-8cdf-4c4a-a417-45cae5339afd',
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
      isSynced: true
    },
    {
      id: '3953e230-aa63-4e39-bc53-124653648d86',
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
      isSynced: true
    },
    {
      id: '3d509eaa-c8df-4e03-a49d-f71edbc4564e',
      name: 'Overhead Press',
      bodyPartId: bp['Shoulders'],
      equipmentId: eq['Barbell-Standard'],
      isDefaultExercise: true,
      info: [],
      isSynced: true
    },
    {
      id: '9977078c-7518-4189-ba18-3eedd9aa0f9d',
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
      isSynced: true
    },
    {
      id: '962355b1-eccc-4f82-8e05-8264dd984fd7',
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
      isSynced: true
    },
    {
      id: '30fe94c2-33fa-4f70-92d0-cfcfb977207f',
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
      isSynced: true
    },
    {
      id: 'd7b2ab2e-d310-43a8-aea2-5eb497e445cb',
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
      id: '3de6315a-7391-49cf-817b-acb511c9e5af',
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
      isSynced: true
    },
    {
      id: '00abdfd6-5f77-4783-b871-65a96d1b977d',
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
      isSynced: true
    },
  ];

  const exerciseRows = exerciseList.map(ex => ({
    id: ex.id,
    name: ex.name,
    link: ex.link ?? null,
    info: JSON.stringify(ex.info),
    imageName: null,
    bodyPartId: ex.bodyPartId,
    equipmentId: ex.equipmentId,
    isDefaultExercise: ex.isDefaultExercise,
    isSynced: ex.isSynced,
  }));

  await db.insert(exercises).values(exerciseRows);
  console.log('Inserted exercises');

  const exMap = Object.fromEntries(
    exerciseRows.map(e => [e.name, e.id])
  );

  //
  // WORKOUTS
  //
  const fullBodyId = '976c421f-6388-4a80-be6c-192ec58ce822';
  const upperBodyId = 'e3489389-52f9-4e1b-af23-fbf6ea9b9f12';

  await db.insert(workouts).values([
    {
      id: fullBodyId,
      name: 'Full Body Beginner',
      isDefaultWorkout: true,
      exerciseCount: 5,
      setCount: 15,
      createdAt: now(),
      isSynced: true
    },
    {
      id: upperBodyId,
      name: 'Upper Body Focus',
      isDefaultWorkout: true,
      exerciseCount: 3,
      setCount: 9,
      createdAt: now(),
      isSynced: true
    },
  ]);

  //
  // WORKOUT EXERCISES
  //
  const workoutExercisesList: InferInsertModel<typeof workoutExercises>[] = [];

  const fullBodyOrder = [
    { id: 'f1803f9e-e3c2-4a21-b89c-da9ece8d6403', name: 'Squat' },
    { id: '63a667dd-c070-49e7-a136-9d67d4ac5422', name: 'Bench Press - Flat' },
    { id: 'e4b0e3ee-b53e-4ab3-9c34-3a6d455155fd', name: 'Deadlift' },
    { id: 'f65ee738-3208-4046-a751-7ff29cd7897d', name: 'Overhead Press' },
    { id: 'c300da8f-c79e-4058-8e58-19a49e36216a', name: 'Barbell Row' },
  ];

  fullBodyOrder.forEach((ex, index) => {
    workoutExercisesList.push({
      id: ex.id,
      workoutId: fullBodyId,
      exerciseId: exMap[ex.name],
      order: index + 1,
      isSynced: true
    });
  });

  const upperBodyOrder = [
    { id: '1e2b09a8-3584-4688-9085-3c20dc287d1e', name: 'Bench Press - Flat' },
    { id: 'e1a6be6f-5ae3-4708-bb54-6e1956ee09e9', name: 'Overhead Press' },
    { id: 'f52c7fb9-9346-4f71-a3e4-7b923fb139f9', name: 'Barbell Row' },
  ];

  upperBodyOrder.forEach((ex, index) => {
    workoutExercisesList.push({
      id: ex.id,
      workoutId: upperBodyId,
      exerciseId: exMap[ex.name],
      order: index + 1,
      isSynced: true
    });
  });

  await db.insert(workoutExercises).values(workoutExercisesList);
  console.log('Inserted workout exercises');

  //
  // SETS
  //
  const setsRows: InferInsertModel<typeof sets>[] = [];

  const fullBodySets = [
    { id: '4fa15e11-151e-4d2a-8593-207ae08d9946', workoutExerciseId: 'f1803f9e-e3c2-4a21-b89c-da9ece8d6403', setNumber: 1, targetReps: 10, targetWeight: 135 },
    { id: '7d049142-2c5b-4e66-a433-8967a51a5fed', workoutExerciseId: 'f1803f9e-e3c2-4a21-b89c-da9ece8d6403', setNumber: 2, targetReps: 10, targetWeight: 135 },
    { id: '2c1b4a8f-163d-4bd9-9d94-0114b5e62366', workoutExerciseId: 'f1803f9e-e3c2-4a21-b89c-da9ece8d6403', setNumber: 3, targetReps: 10, targetWeight: 135 },
    { id: '31da5a5c-8bc4-4a46-8e38-7abd4d45af85', workoutExerciseId: '63a667dd-c070-49e7-a136-9d67d4ac5422', setNumber: 1, targetReps: 10, targetWeight: 135 },
    { id: 'eac774da-3fa4-48f6-ae73-7b89fa8ac47b', workoutExerciseId: '63a667dd-c070-49e7-a136-9d67d4ac5422', setNumber: 2, targetReps: 10, targetWeight: 135 },
    { id: 'c9c076ab-5c70-41ab-84de-0b2099f1bcc0', workoutExerciseId: '63a667dd-c070-49e7-a136-9d67d4ac5422', setNumber: 3, targetReps: 10, targetWeight: 135 },
    { id: '02b3db7d-317e-4087-ae50-5db99a857a46', workoutExerciseId: 'e4b0e3ee-b53e-4ab3-9c34-3a6d455155fd', setNumber: 1, targetReps: 10, targetWeight: 135 },
    { id: 'fda1b419-3166-43de-997e-c232fc5712bb', workoutExerciseId: 'e4b0e3ee-b53e-4ab3-9c34-3a6d455155fd', setNumber: 2, targetReps: 10, targetWeight: 135 },
    { id: 'a60c4416-e28f-4902-8248-f4f46c53df23', workoutExerciseId: 'e4b0e3ee-b53e-4ab3-9c34-3a6d455155fd', setNumber: 3, targetReps: 10, targetWeight: 135 },
    { id: 'fa2e52d9-62c5-431f-b921-98f4484401e6', workoutExerciseId: 'f65ee738-3208-4046-a751-7ff29cd7897d', setNumber: 1, targetReps: 10, targetWeight: 135 },
    { id: '2a80d39e-a1a3-4b81-9ba0-fcc3f6f9c6a3', workoutExerciseId: 'f65ee738-3208-4046-a751-7ff29cd7897d', setNumber: 2, targetReps: 10, targetWeight: 135 },
    { id: 'eb63405f-12dc-45dc-9e5d-fcef6ae2b485', workoutExerciseId: 'f65ee738-3208-4046-a751-7ff29cd7897d', setNumber: 3, targetReps: 10, targetWeight: 135 },
    { id: '60ee176d-0455-400e-a125-7b3349e0cb69', workoutExerciseId: 'c300da8f-c79e-4058-8e58-19a49e36216a', setNumber: 1, targetReps: 10, targetWeight: 135 },
    { id: 'b5e0cb0b-2a80-4184-8ad2-d437faecdc66', workoutExerciseId: 'c300da8f-c79e-4058-8e58-19a49e36216a', setNumber: 2, targetReps: 10, targetWeight: 135 },
    { id: 'c3a0ccdd-b287-415a-8049-badc99c58a92', workoutExerciseId: 'c300da8f-c79e-4058-8e58-19a49e36216a', setNumber: 3, targetReps: 10, targetWeight: 135 },
  ];

  const upperBodySets = [
    { id: 'e71477ec-ef4c-4280-acdf-a3c778ae9ce0', workoutExerciseId: '1e2b09a8-3584-4688-9085-3c20dc287d1e', setNumber: 1, targetReps: 8, targetWeight: 135 },
    { id: 'd4c45e8d-52e6-41bd-9b10-031925c5cd79', workoutExerciseId: '1e2b09a8-3584-4688-9085-3c20dc287d1e', setNumber: 2, targetReps: 8, targetWeight: 135 },
    { id: 'ecf88a22-d1d9-4cef-9b43-509b42e0346f', workoutExerciseId: '1e2b09a8-3584-4688-9085-3c20dc287d1e', setNumber: 3, targetReps: 8, targetWeight: 135 },
    { id: 'f4dc60ed-54e4-4414-a617-3b61a16e8f5e', workoutExerciseId: 'e1a6be6f-5ae3-4708-bb54-6e1956ee09e9', setNumber: 1, targetReps: 8, targetWeight: 135 },
    { id: '486ae2fd-b240-4f09-918c-82bd85ab4a7f', workoutExerciseId: 'e1a6be6f-5ae3-4708-bb54-6e1956ee09e9', setNumber: 2, targetReps: 8, targetWeight: 135 },
    { id: '3b5167bd-89bf-4f44-850e-97b72c2b788e', workoutExerciseId: 'e1a6be6f-5ae3-4708-bb54-6e1956ee09e9', setNumber: 3, targetReps: 8, targetWeight: 135 },
    { id: '4c3db3c2-f312-4735-bee1-eed8545d8094', workoutExerciseId: 'f52c7fb9-9346-4f71-a3e4-7b923fb139f9', setNumber: 1, targetReps: 8, targetWeight: 135 },
    { id: '615fa12f-a27f-449a-85be-62101f9956b0', workoutExerciseId: 'f52c7fb9-9346-4f71-a3e4-7b923fb139f9', setNumber: 2, targetReps: 8, targetWeight: 135 },
    { id: '863b5069-7417-4ad2-b3c4-29101cd33cde', workoutExerciseId: 'f52c7fb9-9346-4f71-a3e4-7b923fb139f9', setNumber: 3, targetReps: 8, targetWeight: 135 },
  ]

  fullBodySets.forEach(set => {
    setsRows.push({
      id: set.id,
      workoutExerciseId: set.workoutExerciseId,
      setNumber: set.setNumber,
      targetReps: set.targetReps,
      targetWeight: set.targetWeight,
      isSynced: true
    });
  });

  upperBodySets.forEach(set => {
    setsRows.push({
      id: set.id,
      workoutExerciseId: set.workoutExerciseId,
      setNumber: set.setNumber,
      targetReps: set.targetReps,
      targetWeight: set.targetWeight,
      isSynced: true
    });
  });
  await db.insert(sets).values(setsRows);

  console.log('✅ Seed complete');
}