// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import * as fs from "@ts-common/fs"
// import * as process from "process"
import * as path from "path"
import * as cm from "@ts-common/commonmark-to-markdown"
import * as it from "@ts-common/iterator"
import * as yaml from "js-yaml"

type Code = {
  readonly "input-file"?: ReadonlyArray<string>|string
}
const magic = `yaml $(tag) == 'all-api-versions' /* autogenerated */`;
const header = `## Multi-API/Profile support for AutoRest v3 generators`;


const main = async (specificationDir: string, profilesDir: string) => {
  try {
    const list = fs.recursiveReaddir(specificationDir)
    for await (const file of list) {
      const f = path.parse(file)
      if (f.base === "readme.md") {
        const original_content = (await fs.readFile(file)).toString()
        let content = original_content;
        const readMe = cm.parse(content)
        const set = new Set<string>()
        for (const c of cm.iterate(readMe.markDown)) {
          if (
            c.type === "code_block" &&
            c.info !== null &&
            (c.info.startsWith("yaml") && !c.info.startsWith(magic)) &&
            c.literal !== null
          ) {
            const DOC = (yaml.load(c.literal) as Code);
            if (DOC ) {
              const y = DOC['input-file']
              if (typeof y === "string") {
                set.add(`$(this-folder)/${y}`)
              } else if (it.isArray(y)) {
                for (const i of y) {
                  set.add(`$(this-folder)/${i}`)
                }
              }
            }
            
          }
        }
        if( !content.includes(header) ) {
          // add the header to the content 
          content = content + `
${header} 

AutoRest V3 generators require the use of \`--tag=all-api-versions\` to select api files.

This block is updated by an automatic script. Edits may be lost!

\`\`\` ${magic} 
\`\`\`

If there are files that should not be in the \`all-api-versions\` set, 
uncomment the  \`exclude-file\` section below and add the file paths.

\`\`\` yaml $(tag) == 'all-api-versions'
#exclude-file: 
#  - $(this-folder)/Microsoft.Example/stable/2010-01-01/somefile.json
\`\`\`

`
        }
        // update the autogenrated block with the new content.
        /* const readMeMulti = cm.createNode(
          "document",
          cm.createNode(
            "heading",
            cm.createText("# Multi-API/Profile support for AutoRest v3 generators")
          ),
          cm.createCodeBlock(
            magic,
            yaml.dump({ "input-file": it.toArray(set), "require": `$(this-folder)/${path.relative(f.dir, profilesDir).replace(/\\/g, '/')}/readme.md` }, { lineWidth: 1000 })
          )
        )
        const block1 =cm.markDownExToString({ markDown: cm.createCodeBlock(
          magic,
          yaml.dump({ 
            "input-file": it.toArray(set), 
            "require": `$(this-folder)/${path.relative(f.dir, profilesDir).replace(/\\/g, '/')}/readme.md` }, { lineWidth: 1000 })
        )});*/
        const block = 
`\`\`\` ${magic}
# include the azure profile definitions from the standard location
require: $(this-folder)/${path.relative(f.dir, profilesDir).replace(/\\/g, '/')}/readme.md

# all the input files across all versions
${yaml.dump({ 'input-file': it.toArray(set) },{ lineWidth: 1000 } )}
\`\`\``
        content = content.replace( /``` yaml \$\(tag\) == 'all-api-versions' \/\* autogenerated \*\/[\S\s]*?```/g, block)

        if(original_content !== content ){
          console.log(`Updating: ${file}`);
          fs.writeFile(path.join(f.dir, "readme.md"), content)
        }
        
      }
    }
  } catch (e) {
    console.error(e)
  }
}

main(path.join("D:\\Temp\\specification"), "D:\\Temp\\profiles");