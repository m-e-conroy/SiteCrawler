import fs from 'fs';
import path from 'path';

/**
 * Generate HTML report from metaKeywords.json file
 * @param {string} inputFilePath - Path to the metaKeywords.json file
 * @param {string} outputFilePath - Path where to save the HTML report
 */
function generateKeywordsReport(inputFilePath, outputFilePath) {
  try {
    // Read the JSON file
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const data = JSON.parse(rawData);
    
    // Extract data
    const uniqueKeywords = data.uniqueKeywords || [];
    const pages = data.pages || {};
    
    // Create HTML content
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metadata Keywords Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        h1, h2 {
            color: #005;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .stats {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 16px;
        }
        .stats span {
            font-weight: bold;
            color: #0055aa;
        }
        .search-container {
            margin-bottom: 20px;
        }
        input[type="text"] {
            padding: 8px;
            width: 300px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 30px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #0055aa;
            color: white;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        .keyword-list {
            column-count: 3;
            column-gap: 20px;
        }
        .keyword-item {
            break-inside: avoid-column;
            margin-bottom: 8px;
            padding: 5px;
            background-color: #f9f9f9;
            border-radius: 3px;
        }
        .tab {
            overflow: hidden;
            border: 1px solid #ccc;
            background-color: #f1f1f1;
            margin-bottom: 20px;
        }
        .tab button {
            background-color: inherit;
            float: left;
            border: none;
            outline: none;
            cursor: pointer;
            padding: 14px 16px;
            transition: 0.3s;
            font-size: 16px;
        }
        .tab button:hover {
            background-color: #ddd;
        }
        .tab button.active {
            background-color: #0055aa;
            color: white;
        }
        .tabcontent {
            display: none;
            padding: 6px 12px;
            border: 1px solid #ccc;
            border-top: none;
        }
        a {
            color: #0055aa;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .keyword-count {
            background-color: #eee;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 0.8em;
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Site Metadata Keywords Report</h1>
        
        <div class="stats">
            <p>Total unique keywords: <span>${uniqueKeywords.length}</span></p>
            <p>Total pages analyzed: <span>${Object.keys(pages).length}</span></p>
        </div>
        
        <div class="tab">
            <button class="tablinks active" onclick="openTab(event, 'PagesTab')">Pages</button>
            <button class="tablinks" onclick="openTab(event, 'KeywordsTab')">Keywords</button>
        </div>
        
        <div id="PagesTab" class="tabcontent" style="display: block;">
            <h2>Pages and Associated Keywords</h2>
            
            <div class="search-container">
                <input type="text" id="pageSearch" placeholder="Search for pages or keywords..." onkeyup="filterPages()">
            </div>
            
            <table id="pagesTable">
                <thead>
                    <tr>
                        <th onclick="sortTable(0)">Page Title</th>
                        <th onclick="sortTable(1)">URL</th>
                        <th>Keywords</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(pages).map(pageId => {
                        const page = pages[pageId];
                        return `<tr>
                            <td>${page.page}</td>
                            <td><a href="${page.url}" target="_blank">${page.url}</a></td>
                            <td>${page.keywords.join(", ")}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div id="KeywordsTab" class="tabcontent">
            <h2>All Unique Keywords</h2>
            
            <div class="search-container">
                <input type="text" id="keywordSearch" placeholder="Search for keywords..." onkeyup="filterKeywords()">
            </div>
            
            <div class="keyword-list" id="keywordList">
                ${uniqueKeywords.map(keyword => {
                    // Count how many pages use this keyword
                    const usageCount = Object.values(pages).filter(page => 
                        page.keywords.includes(keyword)
                    ).length;
                    
                    return `<div class="keyword-item">
                        ${keyword}
                        <span class="keyword-count">${usageCount}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>
    
    <script>
        function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
        }
        
        function filterPages() {
            const input = document.getElementById("pageSearch");
            const filter = input.value.toLowerCase();
            const table = document.getElementById("pagesTable");
            const rows = table.getElementsByTagName("tr");
            
            for (let i = 1; i < rows.length; i++) {
                const titleCell = rows[i].getElementsByTagName("td")[0];
                const urlCell = rows[i].getElementsByTagName("td")[1];
                const keywordsCell = rows[i].getElementsByTagName("td")[2];
                
                if (titleCell && urlCell && keywordsCell) {
                    const titleText = titleCell.textContent || titleCell.innerText;
                    const urlText = urlCell.textContent || urlCell.innerText;
                    const keywordsText = keywordsCell.textContent || keywordsCell.innerText;
                    
                    if (
                        titleText.toLowerCase().indexOf(filter) > -1 ||
                        urlText.toLowerCase().indexOf(filter) > -1 ||
                        keywordsText.toLowerCase().indexOf(filter) > -1
                    ) {
                        rows[i].style.display = "";
                    } else {
                        rows[i].style.display = "none";
                    }
                }
            }
        }
        
        function filterKeywords() {
            const input = document.getElementById("keywordSearch");
            const filter = input.value.toLowerCase();
            const keywordItems = document.getElementsByClassName("keyword-item");
            
            for (let i = 0; i < keywordItems.length; i++) {
                const keywordText = keywordItems[i].textContent || keywordItems[i].innerText;
                if (keywordText.toLowerCase().indexOf(filter) > -1) {
                    keywordItems[i].style.display = "";
                } else {
                    keywordItems[i].style.display = "none";
                }
            }
        }
        
        function sortTable(n) {
            let table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
            table = document.getElementById("pagesTable");
            switching = true;
            dir = "asc";
            
            while (switching) {
                switching = false;
                rows = table.rows;
                
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    x = rows[i].getElementsByTagName("td")[n];
                    y = rows[i + 1].getElementsByTagName("td")[n];
                    
                    if (dir == "asc") {
                        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                            shouldSwitch = true;
                            break;
                        }
                    } else if (dir == "desc") {
                        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                            shouldSwitch = true;
                            break;
                        }
                    }
                }
                
                if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                    switchcount++;
                } else {
                    if (switchcount == 0 && dir == "asc") {
                        dir = "desc";
                        switching = true;
                    }
                }
            }
        }
    </script>
</body>
</html>`;
    
    // Write the HTML file
    fs.writeFileSync(outputFilePath, html);
    console.log(`HTML report generated successfully at: ${outputFilePath}`);
    
  } catch (error) {
    console.error('Error generating report:', error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  let inputFilePath;
  let outputFilePath;
  
  if (args.length > 0) {
    inputFilePath = args[0];
  } else {
    // Default to the admissions project
    inputFilePath = path.join(__dirname, 'projects', 'admissions', 'metaKeywords.json');
  }
  
  // Generate output file path in the same directory as the input file
  const outputDir = path.dirname(inputFilePath);
  const outputFileName = path.basename(inputFilePath, '.json') + '_report.html';
  outputFilePath = path.join(outputDir, outputFileName);
  
  generateKeywordsReport(inputFilePath, outputFilePath);
}

main();