import { getPocketBase, authenticateAdmin } from "../src/services/pocketbase.js";
import { normalizeText } from "../src/utils/dataNormalizer.js";
import { sheetsSyncQueue } from "../src/services/sheetsSyncQueue.js";

async function main() {
  try {
    console.log("🔓 Authenticating Admin...");
    await authenticateAdmin();
    const pb = getPocketBase();
    console.log("✅ Authenticated.");

    console.log("\n🏫 1. Migrating Campuses...");
    const campuses = await pb.collection("campuses").getFullList();
    for (const c of campuses) {
      const cleanName = normalizeText(c.name, 'title');
      const cleanLoc = normalizeText(c.location, 'title');
      if (cleanName !== c.name || cleanLoc !== c.location) {
        console.log(`- Updating campus: "${c.name}" ➔ "${cleanName}"`);
        await pb.collection("campuses").update(c.id, { name: cleanName, location: cleanLoc });
      }
    }

    console.log("\n🏢 2. Migrating Departments...");
    const departments = await pb.collection("departments").getFullList();
    for (const d of departments) {
      const cleanName = normalizeText(d.name, 'title');
      if (cleanName !== d.name) {
        console.log(`- Updating department: "${d.name}" ➔ "${cleanName}"`);
        await pb.collection("departments").update(d.id, { name: cleanName });
      }
    }

    console.log("\n🏛️ 3. Migrating Faculties...");
    const faculties = await pb.collection("faculties").getFullList();
    for (const f of faculties) {
      const cleanName = normalizeText(f.name, 'title');
      if (cleanName !== f.name) {
        console.log(`- Updating faculty: "${f.name}" ➔ "${cleanName}"`);
        await pb.collection("faculties").update(f.id, { name: cleanName });
      }
    }

    console.log("\n📜 4. Migrating Programs...");
    const programs = await pb.collection("programs").getFullList();
    for (const p of programs) {
      const cleanName = normalizeText(p.name, 'title');
      if (cleanName !== p.name) {
        console.log(`- Updating program: "${p.name}" ➔ "${cleanName}"`);
        await pb.collection("programs").update(p.id, { name: cleanName });
      }
    }

    console.log("\n📘 5. Migrating Courses...");
    const courses = await pb.collection("courses").getFullList();
    for (const c of courses) {
      const cleanTitle = normalizeText(c.title, 'title');
      const cleanCategory = normalizeText(c.category, 'title');
      const cleanDept = normalizeText(c.department, 'title');
      const cleanFac = normalizeText(c.faculty, 'title');
      if (
        cleanTitle !== c.title ||
        cleanCategory !== c.category ||
        cleanDept !== c.department ||
        cleanFac !== c.faculty
      ) {
        console.log(`- Updating course: "${c.title}" ➔ "${cleanTitle}"`);
        await pb.collection("courses").update(c.id, {
          title: cleanTitle,
          category: cleanCategory,
          department: cleanDept,
          faculty: cleanFac
        });
      }
    }

    console.log("\n🧑‍🏫 6. Migrating Staff...");
    const staff = await pb.collection("staff").getFullList();
    for (const s of staff) {
      const cleanFirst = normalizeText(s.first_name, 'name');
      const cleanLast = normalizeText(s.last_name, 'name');
      const cleanFull = normalizeText(s.full_name || `${cleanFirst} ${cleanLast}`, 'name');
      if (cleanFirst !== s.first_name || cleanLast !== s.last_name || cleanFull !== s.full_name) {
        console.log(`- Updating staff: "${s.full_name}" ➔ "${cleanFull}"`);
        await pb.collection("staff").update(s.id, {
          first_name: cleanFirst,
          last_name: cleanLast,
          full_name: cleanFull
        });
      }
    }

    console.log("\n🧑‍🎓 7. Migrating Students...");
    const students = await pb.collection("students").getFullList();
    let syncCount = 0;
    for (const s of students) {
      const cleanFirst = normalizeText(s.first_name, 'name');
      const cleanLast = normalizeText(s.last_name, 'name');
      const cleanFull = normalizeText(s.full_name || `${cleanFirst} ${cleanLast}`, 'name');
      const cleanProg = normalizeText(s.programme, 'title');
      
      if (
        cleanFirst !== s.first_name ||
        cleanLast !== s.last_name ||
        cleanFull !== s.full_name ||
        cleanProg !== s.programme
      ) {
        console.log(`- Updating student: "${s.full_name}" ➔ "${cleanFull}"`);
        await pb.collection("students").update(s.id, {
          first_name: cleanFirst,
          last_name: cleanLast,
          full_name: cleanFull,
          programme: cleanProg
        });
        
        // Enqueue synchronization back to Google Sheets
        sheetsSyncQueue.enqueueStudentSync("update", s.id);
        syncCount++;
      }
    }

    console.log(`\n🎉 Database migration complete! Enqueued ${syncCount} students for Google Sheets sync.`);
    
    if (syncCount > 0) {
      console.log("\n⏳ Waiting for Google Sheets synchronization queue to process all updates (15 seconds)...");
      await new Promise((resolve) => setTimeout(resolve, 15000));
      console.log("✅ Google Sheets sync completed.");
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
