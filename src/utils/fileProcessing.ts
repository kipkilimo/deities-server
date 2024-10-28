import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function splitPdfToPng(pdfFilePath: string): Promise<string[]> {
  const tempDir = path.join(__dirname, "temp");
  const outputPrefix = path.join(tempDir, `${uuidv4()}_page_`);
  const imagePaths: string[] = [];

  await fs.mkdir(tempDir, { recursive: true });

  return new Promise((resolve, reject) => {
    // Execute pdftoppm to convert PDF to PNG files
    exec(
      `pdftoppm -png "${pdfFilePath}" "${outputPrefix}"`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error("Error converting PDF:", error);
          reject("Failed to process PDF.");
          return;
        }

        // Collect all generated PNG files
        try {
          const files = await fs.readdir(tempDir);
          files.forEach((file) => {
            if (file.endsWith(".png")) {
              imagePaths.push(path.join(tempDir, file));
            }
          });
          resolve(imagePaths);
        } catch (readError) {
          console.error("Error reading output directory:", readError);
          reject("Failed to read output directory.");
        }
      }
    );
  });
}
