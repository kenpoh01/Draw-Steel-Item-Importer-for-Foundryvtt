import {
  parseMultipleAbilities,  preprocessRawAbilities, 
  } from "./parsers/abilityParser.js";
  
import {
  preprocessStartingAbilities
} from "./parsers/startingAbilityParser.js";

  

export class ItemImporterApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "item-importer",
      title: "Draw Steel Item Importer",
      template: "modules/draw-steel-item-importer/templates/importer-ui.html",
      classes: ["draw-steel", "item-importer"],
      width: 500,
      height: "auto",
      resizable: true
    });
  }

  getData() {
    return {
      itemTypes: [
        "ability (only with cost like (3 Ferocity)",
        "ability without cost (starting)",
        "malice (not yet implemented)",
        "feature (not yet implemented)",
        "equipment (not yet implemented)",
        "power (not yet implemented)"
      ]
    };
  }

  activateListeners(html) {
    console.log("ItemImporterApp listeners activated");

    html.find("#import-button").on("click", async () => {
      const type = html.find("#item-type").val();
      const rawText = html.find("#item-text").val()?.trim();
      const folderName = html.find("#folder-name").val()?.trim();

      if (!type || !rawText) {
        ui.notifications.warn("Please select an item type and paste item text.");
        return;
      }

      let folderId = null;

      if (folderName) {
        const existingFolder = game.folders.find(
          f => f.name === folderName && f.type === "Item"
        );

        if (existingFolder) {
          folderId = existingFolder.id;
        } else {
          try {
            const newFolder = await Folder.create({
              name: folderName,
              type: "Item",
              parent: null,
              color: "#4b4a4a",
              sorting: "m"
            });
            folderId = newFolder.id;
          } catch (err) {
            console.error("Folder creation failed:", err);
            ui.notifications.error("Unable to create folder.");
            return;
          }
        }
      }

 let parsedItems = [];

console.log(`🧭 Importer routing: selected type = "${type}"`);

if (type === "ability (only with cost like (3 Ferocity)") {
  console.log("🔧 Using costed ability parser (preprocessRawAbilities + parseMultipleAbilities)");
  const structuredItems = preprocessRawAbilities(rawText);
  parsedItems = parseMultipleAbilities(structuredItems);
} else if (type === "ability without cost (starting)") {
  console.log("🌀 Using costless ability parser (preprocessStartingAbilities)");
  parsedItems = preprocessStartingAbilities(rawText);
} else {
  console.warn(`⚠️ Unknown item type selected: "${type}"`);
  ui.notifications.warn(`${type} is not yet implemented.`);
  return;
}

      for (const parsed of parsedItems) {
        if (!parsed || !parsed.name) continue;
        parsed.folder = folderId;

        try {
          await CONFIG.Item.documentClass.createDocuments([parsed]);
          ui.notifications.info(`Created ${type}: ${parsed.name}`);
        } catch (err) {
          console.error("Item creation failed:", err);
          ui.notifications.error(`Error creating item: ${parsed.name}`);
        }
      }

      this.close();
    });
  }
}

// 🔗 Hook to inject the importer button into the Item Directory
Hooks.on("renderItemDirectory", (app, html, data) => {
  const $html = $(html);
  const button = $(`
    <button class="item-importer-button">
      <i class="fas fa-download"></i> Import Draw Steel Item
    </button>
  `);

  button.click(() => new ItemImporterApp().render(true));
  $html.find(".directory-footer").append(button);
});