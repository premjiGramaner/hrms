import pool from "./src/config/db.js";

async function convertSupervisorIdsToNames() {
  const client = await pool.connect();

  try {
    // Get all employees with supervisors
    const { rows: employees } = await client.query(`
      SELECT id, supervisors 
      FROM tbl_appusers 
      WHERE supervisors IS NOT NULL 
      AND supervisors != '[]'
      AND supervisors != ''
      AND is_deleted = false
    `);

    let converted = 0;
    let skipped = 0;

    for (const employee of employees) {
      try {
        // Parse supervisors (should be array of IDs like [35, 36])
        let supervisorIds = JSON.parse(employee.supervisors);

        // Check if it's already names (strings) or IDs (numbers)
        if (supervisorIds.length > 0 && typeof supervisorIds[0] === "string") {
          skipped++;
          continue;
        }

        // Convert IDs to integers
        const validIds = supervisorIds
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id) && id > 0);

        if (validIds.length === 0) {
          continue;
        }

        // Fetch supervisor names
        const { rows: supervisors } = await client.query(
          `
          SELECT name 
          FROM tbl_appusers 
          WHERE id = ANY($1::int[]) 
          AND is_deleted = false
          ORDER BY name
        `,
          [validIds],
        );

        if (supervisors.length === 0) {
          continue;
        }

        // Extract names
        const supervisorNames = supervisors.map((s) => s.name);

        // Update employee record
        await client.query(
          `
          UPDATE tbl_appusers 
          SET supervisors = $1 
          WHERE id = $2
        `,
          [JSON.stringify(supervisorNames), employee.id],
        );
        converted++;
      } catch (err) {
        console.error(
          `❌ Error processing employee ${employee.id}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the conversion
convertSupervisorIdsToNames()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    process.exit(1);
  });
