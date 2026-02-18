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
      info: ['Break parallel', 'Keep bar over mid-foot'],
    },
    {
      name: 'Bench Press - Flat',
      bodyPartId: bp['Chest'],
      equipmentId: eq['Barbell-Standard'],
      link: 'https://youtube.com/shorts/hWbUlkb5Ms4',
      info: ['Arch upper back', '45° elbow angle'],
    },
    {
      name: 'Deadlift',
      bodyPartId: bp['Back'],
      equipmentId: eq['Barbell-Standard'],
      link: 'https://youtube.com/shorts/ZaTM37cfiDs',
      info: ['Bar over mid-foot', 'Drive hips forward'],
    },
    {
      name: 'Overhead Press',
      bodyPartId: bp['Shoulders'],
      equipmentId: eq['Barbell-Standard'],
      info: [],
    },
    {
      name: 'Barbell Row',
      bodyPartId: bp['Back'],
      equipmentId: eq['Barbell-Standard'],
      info: [],
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
  }));

  await db.insert(exercises).values(exerciseRows);
  console.log('Inserted exercises');

  const exMap = Object.fromEntries(
    exerciseRows.map(e => [e.name, e.id])
  );

  //
  // WORKOUT TEMPLATES
  //
  const fullBodyId = crypto.randomUUID();
  const upperBodyId = crypto.randomUUID();

  await db.insert(workouts).values([
    {
      id: fullBodyId,
      name: 'Full Body Beginner',
      userId: null,
      isDefaultTemplate: true,
      createdAt: now(),
    },
    {
      id: upperBodyId,
      name: 'Upper Body Focus',
      userId: null,
      isDefaultTemplate: true,
      createdAt: now(),
    },
  ]);

  //
  // WORKOUT EXERCISES
  //
  const templateExercises: InferInsertModel<typeof workoutExercises>[] = []; 

  const fullBodyOrder = [
    'Squat',
    'Bench Press - Flat',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
  ];

  fullBodyOrder.forEach((name, index) => {
    templateExercises.push({
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
    templateExercises.push({
      id: crypto.randomUUID(),
      workoutId: upperBodyId,
      exerciseId: exMap[name],
      order: index + 1,
    });
  });

  await db.insert(workoutExercises).values(templateExercises);
  console.log('Inserted workout exercises');

  //
  // SETS
  //
  const setsRows: InferInsertModel<typeof sets>[] = [];

  templateExercises.forEach(te => {
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