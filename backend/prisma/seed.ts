import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (order matters because of FKs)
  await prisma.set.deleteMany()
  await prisma.sessionSet.deleteMany()
  await prisma.workoutExercise.deleteMany()
  await prisma.sessionExercise.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.workout.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.bodyPart.deleteMany()

  const bodyParts = await prisma.bodyPart.createMany({
    data: [
      { name: 'Legs' },
      { name: 'Chest' },
      { name: 'Back' },
      { name: 'Shoulders' },
      { name: 'Arms' },
      { name: 'Core' },
      { name: 'Glutes' },
      { name: 'Neck' }
    ],
  })

  console.log(`✅ Created ${bodyParts.count} body parts`)

  const equipment = await prisma.equipment.createMany({
    data: [
      { name: 'Barbell-Standard' },
      { name: 'Barbell-Olympic' },
      { name: 'Barbell-Powerlifting' },
      { name: 'Safety squat bar' },
      { name: 'EZ curl bar' },
      { name: 'Cambered bar' },
      { name: 'Trap bar' },
      { name: 'Pull-up bar' },
      { name: 'Dip bar' },
      { name: 'Dumbbell' },
      { name: 'Kettlebell' },
      { name: 'Cable' },
      { name: 'Machine' },
      { name: 'Bodyweight' },
      { name: 'Resistance band' },
      { name: 'Plate' },
      { name: 'Other' },
    ],
  })
  console.log(`✅ Created ${equipment.count} equipment`)

  // Create exercises
  const exercises = await prisma.exercise.createMany({
    data: [
      { name: 'Squat', bodyPartId: 1, equipmentId: 1 },
      { name: 'Bench Press', bodyPartId: 2, equipmentId: 1 },
      { name: 'Deadlift', bodyPartId: 3, equipmentId: 1 },
      { name: 'Overhead Press', bodyPartId: 4, equipmentId: 1 },
      { name: 'Barbell Row', bodyPartId: 3, equipmentId: 1 },
      { name: 'Pull-ups', bodyPartId: 3, equipmentId: 8 },
      { name: 'Dips', bodyPartId: 2, equipmentId: 9 },
      { name: 'Push-ups', bodyPartId: 2, equipmentId: 14 },
      { name: 'Bicep Curls', bodyPartId: 5, equipmentId: 10 },
      { name: 'Leg Press', bodyPartId: 1, equipmentId: 13 },
    ],
  })

  console.log(`✅ Created ${exercises.count} exercises`)

  // Get created exercises
  const squat = await prisma.exercise.findUnique({ where: { name: 'Squat' } })
  const benchPress = await prisma.exercise.findUnique({ where: { name: 'Bench Press' } })
  const deadlift = await prisma.exercise.findUnique({ where: { name: 'Deadlift' } })
  const overheadPress = await prisma.exercise.findUnique({ where: { name: 'Overhead Press' } })
  const barbellRow = await prisma.exercise.findUnique({ where: { name: 'Barbell Row' } })

  if (!squat || !benchPress || !deadlift || !overheadPress || !barbellRow) {
    throw new Error('Failed to create exercises')
  }

  // Create workouts
  const fullBodyWorkout = await prisma.workout.create({
    data: {
      name: 'Full Body Beginner',
      isDefaultTemplate: true,
    },
  })

  const upperBodyWorkout = await prisma.workout.create({
    data: {
      name: 'Upper Body Focus',
      isDefaultTemplate: true,
    },
  })

  console.log(`✅ Created 2 templates`)

  // Add exercises to Full Body workout
  const fullBodyExercises = [
    { exercise: squat, order: 1 },
    { exercise: benchPress, order: 2 },
    { exercise: deadlift, order: 3 },
    { exercise: overheadPress, order: 4 },
    { exercise: barbellRow, order: 5 },
  ]

  const fullBodyTemplateExercises = []
  for (const { exercise, order } of fullBodyExercises) {
    const te = await prisma.workoutExercise.create({
      data: {
        workoutId: fullBodyWorkout.id,
        exerciseId: exercise.id,
        order,
      },
    })
    fullBodyTemplateExercises.push(te)
  }

  // Add exercises to Upper Body workout
  const upperBodyExercises = [
    { exercise: benchPress, order: 1 },
    { exercise: overheadPress, order: 2 },
    { exercise: barbellRow, order: 3 },
  ]

  const upperBodyTemplateExercises = []
  for (const { exercise, order } of upperBodyExercises) {
    const te = await prisma.workoutExercise.create({
      data: {
        workoutId: upperBodyWorkout.id,
        exerciseId: exercise.id,
        order,
      },
    })
    upperBodyTemplateExercises.push(te)
  }

  console.log(`✅ Created ${fullBodyTemplateExercises.length + upperBodyTemplateExercises.length} workout exercises`)

  // Create sets for Full Body workout exercises
  const setsData = []

  // Squat: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: fullBodyTemplateExercises[0]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 10,
      targetWeight: 135,
    })
  }

  // Bench Press: 4 sets
  for (let i = 0; i < 4; i++) {
    setsData.push({
      workoutExerciseId: fullBodyTemplateExercises[1]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 8,
      targetWeight: 185,
    })
  }

  // Deadlift: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: fullBodyTemplateExercises[2]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 5,
      targetWeight: 225,
    })
  }

  // Overhead Press: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: fullBodyTemplateExercises[3]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 8,
      targetWeight: 95,
    })
  }

  // Barbell Row: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: fullBodyTemplateExercises[4]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 10,
      targetWeight: 135,
    })
  }

  // Upper Body workout sets
  // Bench Press: 4 sets
  for (let i = 0; i < 4; i++) {
    setsData.push({
      workoutExerciseId: upperBodyTemplateExercises[0]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 8,
      targetWeight: 185,
    })
  }

  // Overhead Press: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: upperBodyTemplateExercises[1]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 8,
      targetWeight: 95,
    })
  }

  // Barbell Row: 3 sets
  for (let i = 0; i < 3; i++) {
    setsData.push({
      workoutExerciseId: upperBodyTemplateExercises[2]?.id ?? 0,
      setNumber: i + 1,
      targetReps: 10,
      targetWeight: 135,
    })
  }

  const sets = await prisma.set.createMany({
    data: setsData,
  })

  console.log(`✅ Created ${sets.count} sets`)

  console.log('✅ Seed completed successfully')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })