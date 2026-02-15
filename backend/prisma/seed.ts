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
      { name: 'Squat', link: "https://youtube.com/shorts/PPmvh7gBTi0?si=w3oKlOBkCZg1sazR", info: 
        [
          "Bar placement: high bar on upper traps (more quads) or low bar 2–3 inches lower (more glutes/low back)",
          "Walk-out: 1 step clear, 2nd to match feet, 3rd only if needed",
          "Stance: just outside shoulder width, toes slightly flared",
          "Depth: break parallel; heels on a plate to make itn easier",
          "Bar path: straight line over mid-foot, keep balanced"
        ], bodyPartId: 1, equipmentId: 1 },
      { name: 'Bench Press - Flat', bodyPartId: 2, link: "https://www.youtube.com/shorts/hWbUlkb5Ms4", info: [
        "Arch: Slight curve in upper back — tuck shoulder blades, chest up. For powerlifting use a bigger arch; keep feet, glutes, upper back, and head planted.",
        "Grip: About 1.5× shoulder width, squeeze the bar hard. Wider grip = more chest; closer grip = more triceps.",
        "Unrack: Press the bar up and arc it forward with locked elbows until your arms are straight up.",
        "Elbows: Tuck slightly inward so they travel at roughly a 45° angle on the way down.",
        "Bar path: Lower down and slightly forward, light touch on lower chest (no bounce). Press up and slightly back and drive your feet into the floor."
      ], equipmentId: 1 },
      { name: 'Deadlift', info: [
        "Stance: Shins about one inch from the bar, feet hip-width, toes slightly out. Bar over the middle of your foot.",
        "Grip: Hinge at the hips with nearly straight knees (no squatting). Grip just outside your shins — over/under, hook, or strapped. Shins on the bar, pointing straight up.",
        "Pull the slack out: Take the slack out gradually; don't yank the bar.",
        "Pull: Chest up and drive hips forward, keeping the bar in contact with your legs.",
        "Lockout: Stand up straight, chest up. Don't shrug or over-squeeze your back.",
        "Lower: Set hips back and bend knees, bar close to your body so it lands over the middle of your foot."
      ], link: "https://www.youtube.com/shorts/ZaTM37cfiDs", bodyPartId: 3, equipmentId: 1 },
      { name: 'Overhead Press', bodyPartId: 4, equipmentId: 1 },
      { name: 'Barbell Row', link: "https://www.youtube.com/shorts/Nqh7q3zDCoQ", info: [
        "Set the bar around knee height and grip it with a wide overhand grip.",
        "Stabilize: feet hip-width, pelvis level, core engaged.",
        "Push hips back and slide the bar along your thighs until it passes your knees.",
        "Pull the bar to your stomach by driving the elbows back, elbows out to about 45°, and squeeze your shoulder blades.",
        "Lower under control and stretch your back by letting your shoulder blades open until your arms are fully extended."
      ], bodyPartId: 3, equipmentId: 1 },
      { name: 'Pull-ups', link: "https://www.youtube.com/shorts/ZPG8OsHKXLw", info: [
        "Grip: Stand on a bench, arms bent to 90°, grab the bar with an overhand grip and thumb over the bar for better back activation.",
        "Setup: Step off the bench slowly, straighten your legs by flexing your quads, and brace your core to bring your feet forward.",
        "Mid-back: Before pulling, set your mid-back by keeping arms straight and pulling your shoulder blades down into your back pockets.",
        "Pull: Drive your elbows down with your lats and upper back; pull until your chest is to the bar and your chin is above it.",
        "Lower: Lower under control until your arms are almost fully straight, then start the next rep."
      ], bodyPartId: 3, equipmentId: 8 },
      { name: 'Dips-Chest', link: "https://www.youtube.com/shorts/CrbIq-T-h8I", info: [
        "Start at the top: arms straight, shoulders down, slight external rotation. Neutral or slightly rounded spine, glutes on, legs straight.",
        "Begin the dip: Lean slightly forward, bend the elbows, let spine and hips flex. Shoulder blades neutral or retracted.",
        "Descent: Go to at least 90° or lower if mobility allows. Keep forearms as vertical as you can and stay tight at the bottom.",
        "Ascent: Push back up and lean back into the top support position."
      ], bodyPartId: 2, equipmentId: 9 },
      { name: 'Push-ups', link: "https://youtube.com/shorts/c-lBErfxszs?si=6UHHFVAbUZ-QW64y", info: [
        "Start on your knees with your hands slightly wider than shoulder-width.",
        "Rock forward so your shoulders are over your hands, then come up onto your toes.",
        "Take a breath in and brace your abs to flatten your lower back.",
        "Lower your whole body as one until your chest touches the floor, then press to a full lockout.",
        "Tuck your arms for comfort and adjust hand width so your forearms are vertical at the bottom.",
        "To make it easier, do push-ups from your knees — that’s a valid option."
      ], bodyPartId: 2, equipmentId: 14 },
      { name: 'Bicep Curls', link: "https://www.youtube.com/shorts/2jpteC44QKg", info: [
        "Roll your shoulders back.",
        "Squeeze your glutes.",
        "Keep your elbows pinned by your sides.",
        "Curl the weight up to your chest.",
        "Squeeze at the top of the movement."
      ], bodyPartId: 5, equipmentId: 10 },
      { name: 'Leg Press', link: "https://www.youtube.com/shorts/nDh_BlnLCGc", info: [
        "Foot position: Higher feet = more glutes; lower feet = more quads. Shoulder-width stance with toes slightly out is a good default.",
        "Controlled negative: Resist the weight on the way down instead of letting it drop to get a better quad stretch.",
        "Depth: Go as deep as you comfortably can for quad and glute growth. If the sled hits the end, use a pad or lighter weight to get more range.",
        "Grip: Hold the handles firmly and pull up on them to keep your glutes on the seat.",
        "Lockout: You can lock out your knees, but avoid snapping them; a very slight bend at the top is fine."
      ], bodyPartId: 1, equipmentId: 13 },
    ],
  })

  console.log(`✅ Created ${exercises.count} exercises`)

  // Get created exercises
  const squat = await prisma.exercise.findUnique({ where: { name: 'Squat' } })
  const benchPress = await prisma.exercise.findUnique({ where: { name: 'Bench Press - Flat' } })
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