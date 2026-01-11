import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "public", "fonts");

const fonts = [
  {
    name: "MPLUSRounded1c-Regular.ttf",
    url: "https://github.com/coz-m/MPLUS_FONTS/raw/master/fonts/ttf/Mplus1-Regular.ttf",
  },
];

async function downloadFonts() {
  // Create fonts directory if it doesn't exist
  if (!existsSync(fontsDir)) {
    mkdirSync(fontsDir, { recursive: true });
    console.log(`Created directory: ${fontsDir}`);
  }

  for (const font of fonts) {
    const filePath = join(fontsDir, font.name);

    if (existsSync(filePath)) {
      console.log(`Font already exists: ${font.name}`);
      continue;
    }

    console.log(`Downloading ${font.name}...`);

    try {
      const response = await fetch(font.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Downloaded: ${font.name} (${buffer.byteLength} bytes)`);
    } catch (error) {
      console.error(`Failed to download ${font.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log("All fonts downloaded successfully!");
}

downloadFonts();
