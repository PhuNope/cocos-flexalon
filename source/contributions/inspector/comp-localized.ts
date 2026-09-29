const prop = require("../../../source/utils/prop.js");

type Selector<$> = { $: Record<keyof $, any | null> } & {
    dump: any;
    _onConfirm?: (event: any) => void
};

export const template = `<div class="autoProps"></div>`;

export const $ = {
    autoProps: ".autoProps",
};

function loadKeys(): string[] {
    const fs = require("fs");
    const path = require("path");

    const jsonPath = path.join(Editor.Project.path, "assets/resources/i18n/en.json");
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    return Object.keys(data);
}

export function update(this: Selector<typeof $>, dump: any) {
    this.dump = dump;
    const self = this;

    prop.updateCustomPropElements(
        this.$.autoProps,
        [],
        dump,
        (element: any, p: any) => {
            if (p.key === "key") {
                const sel = element.querySelector(".keySelect");
                if (sel) {
                    sel.value = p.dump.value;   // đã dựng rồi, chỉ update value
                    return;
                }
                element.innerHTML = "";

                const label = document.createElement("ui-label");
                label.setAttribute("slot", "label");
                label.innerText = "Localization Key";

                const select = document.createElement("ui-select");
                select.setAttribute("slot", "content");
                select.className = "keySelect";
                const keys = loadKeys();
                select.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join("");
                (select as any).value = p.dump.value;

                select.addEventListener("confirm", async (event: any) => {
                    await Editor.Message.request("scene", "set-property", {
                        uuid: self.dump.value.node.value.uuid,
                        path: p.dump.path,
                        dump: {type: p.dump.type, value: event.target.value},
                    });
                    await Editor.Message.request("scene", "snapshot");
                });

                element.appendChild(label);
                element.appendChild(select);
            } else {
                element.render(p.dump);
            }
        }
    );
}

export function ready(this: Selector<typeof $>) {
}

export function close() {
}