// TODO: Not working on mobile , not sure why
import { Plugin, parseYaml, TFile } from "obsidian";

import { getFilteredCsvData } from "./csv_table";
import { TableRenderer, renderErrorPre } from "./render";
import { CsvTableSpec } from "./types";

export default class CsvTablePlugin extends Plugin {
  async onload() {
    console.log('loading obsidian-csv-table plugin');
    this.registerMarkdownCodeBlockProcessor(
      "ad-table-query",
      async (csvSpecString: string, el, ctx) => {
        try {

          let tableSpec: CsvTableSpec = {
            source: "", // Assert that this has a proper value below
          };

          try {
            tableSpec = parseYaml(csvSpecString);
          } catch (e) {
            throw new Error(`Could not parse CSV table spec: ${e.message}`);
          }

          if (!tableSpec.source) {
            throw new Error("Parameter 'source' is required.");
          }

          // console.log('TABLESPEC: \n'+tableSpec);
          

          const file = this.app.vault.getAbstractFileByPath(tableSpec.source);

          if (!(file instanceof TFile)) {
            throw new Error(
              `CSV file '${tableSpec.source}' could not be found.`
            );
          }

          let csvData = ""
          const fileData = await this.app.vault.cachedRead(file);
          
          //******** Check if we have a markdown file rather than a csv file
          if (file.extension === "md") {

            // loop through each line of fileData
            let lines = fileData.split('\n');
            
            // extract tables from fileData
            let table = [];
            let markdownTables = [] 
            // loop through each line of fileData
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('|')) {
                    table.push(lines[i])
                }
                if (!lines[i].startsWith('|') && table.length>0) {
                    markdownTables.push(table)
                    table = []
                }    
            }
            csvData = ""   
            // for each markdown table, extract the csv data
            for (let i = 0; i < markdownTables.length; i++)  {
                if (markdownTables[i].length>0) {
                    let tableRawLines = markdownTables[i]
                    // extract first line of markdown table
                    let markdownTableFirstLine = tableRawLines[0].split('|').map(function(item) {
                        return item.trim();
                    }).join(',').slice(1,-1);
                    // console.log('markdownTableFirstLine: '+markdownTableFirstLine);
                    // console.log('tableSpec.source: '+tableSpec.tableheading);

                    if (markdownTableFirstLine == tableSpec.tableheading) {
        
                        tableRawLines.shift(); // remove header line
                        tableRawLines.shift(); // remove format line
        
                        for (let j = 0; j < tableRawLines.length; j++) {
                            let csvLine = tableRawLines[j].split('|').map(function(item) {
                                return item.trim();
                            }).join(',').slice(1,-1);
                            csvData += csvLine + "\n";
                        
                            //console.log("csvLine: "+csvLine);
                        }

                        csvData=markdownTableFirstLine+'\n'+csvData;
                        
                        console.log('CONVERTED AND CORRECTED CSV DATA:\n'+csvData); 
                        const filteredCsvData = getFilteredCsvData(tableSpec, csvData);
                        ctx.addChild(
                         new TableRenderer(filteredCsvData.columns, filteredCsvData.rows, el)
                         );
                    }
                    
             
                        
                  }
            } //end for
            
        } else{
                // not a markdown file so assume is a csv file
                csvData = fileData;
                console.log('CSV DATA (NOT MARKDOWN FILE):\n'+csvData);  
        }
          
        // const filteredCsvData = getFilteredCsvData(tableSpec, csvData);
        // ctx.addChild(
        //   new TableRenderer(filteredCsvData.columns, filteredCsvData.rows, el)
        //  );
        } catch (e) {
          renderErrorPre(el, e.message);
          return;
        }
      }
    );
  }
}
