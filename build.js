/******************************************************************************
 * Build
 * @description Using the sitemap.json build a static HTML page.
 *****************************************************************************/

// Imports ==================================================================//

import fs from 'fs'
import chalk from 'chalk'
import figlet from 'figlet'
import inquirer from 'inquirer'
import { exit } from 'process'

// Variables ================================================================//

let sitemap, HTML

// Functions ================================================================//

function questions () {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter project name to build: ',
          default: 'Admissions',
          validate: val => val != undefined
        }
      ])
      .then(answers => resolve(answers))
      .catch(error => {
        console.error(chalk.red(`Error crawling ${url}: ${error.essage}`))
      })
  })
} // questions

async function main () {
  console.log(chalk.blue(figlet.textSync('Build', {})))

  const userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())
  
  const projectDir = `projects/${userAnswers.projectName.replace(/[^a-zA-Z]/g, '-').toLowerCase()}`
  const imgDir = `${projectDir}/img`

  sitemap = JSON.parse(fs.readFileSync(`${projectDir}/sitemap.json`))

  sitemap = sitemap.sort((a, b) => {
    if (a.title > b.title) return 1
    if (a.title < b.title) return -1
    return 0
  })

  let alreadyListed = []
  sitemap = sitemap.filter(val => {
    if (!alreadyListed.includes(val.title.trim())) {
      alreadyListed.push(val.title.trim())
      return true
    }
    return false
  })

  console.log(chalk.bgMagentaBright.black(`Building site outline`))

  let CSS = `
    <style>
      body { 
        margin: 0;
        padding: 120px 2em 2em 2em;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 16px;
      }
      .sticky-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background-color: #005bbb;
        color: #ffffff;
        padding: 1em;
      }
      .sticky-nav select {
        padding: .5em;
      }
      h1 {
        margin: .5em 0;
      }
      h1 span {
        font-size: .5em;
      }
      h2 {
        color: #005bbb;
        margin-bottom: .25em;
      }
      .page {
        margin-bottom: 2em;
      }
      .page-link {
        display: block;
        font-size: .75em;
        margin-bottom: 1.25em;
      }
      .page-data {
        width: 100%;
        display: flex;
        flex-direction: row;
      }
      .page-data div:nth-child(odd) {
        background-color: #eeeeee;
      }
      .page-headings, .page-external-links {
        flex: 1 1 50%;
        font-size: .75em;
        padding: 0 1em;
      }
      .page-image {
        flex: 0 1 33%;
        padding: 0 1em;
      }
      ul {
        list-style-type: none;
        margin-block-start: 0;
        padding-inline-start: 0;
      }
      li {
        padding: .5em 0;
      }
    </style>`

  let JS = `
    <script>
      function anchor(value){
        var top = document.getElementById(value).offsetTop;
        window.scrollTo(0, top - 140);
      } // anchor
    </script>`

  let dropdown = []
  let HEAD = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Crawled Site Map: ${userAnswers.projectName}</title>${CSS}${JS}</head><body><div class="sticky-nav"><h1>${userAnswers.projectName}<span> (Crawled: ${new Date().toLocaleString()})</span></h1>`
  let HTML = ''
  for (let i in sitemap) {
    let pageHeadings = '', externalLinks = '', inPageLink = ''

    if (sitemap[i].headings.length) {
      sitemap[i].headings.forEach(heading => {
        const level = parseInt(heading.level, 10) // Convert level to number for padding
        pageHeadings += `<li style="padding-left: ${(level - 1) * 32}px;"><strong>H${level}</strong>: ${heading.text}</li>`
      })
    } else {
      pageHeadings += '<li class="no-page-data">No headings to show.</li>'
    }

    if (sitemap[i].externalLinks.length) {
      externalLinks = sitemap[i].externalLinks.reduce((pVal, cVal) => {
        pVal += `<li><a href="${cVal}">${cVal}</a></li>`
        return pVal
      }, '')
    } else {
      externalLinks += '<li class="no-page-data">No external links found.</li>'
    }

    inPageLink = sitemap[i].title.replace(/[^a-zA-Z]/,'')
    dropdown.push({ title: sitemap[i].title, link: inPageLink })

    HTML += `
      <div class="page">
        <h2 id="${inPageLink}">${sitemap[i].title}</h2>
        <a class="page-link" href="${sitemap[i].url}">${sitemap[i].url}</a>
        <div class="page-data">
          <div class="page-headings">
            <h3>Page Headings</h3>
            <ul>${pageHeadings}</ul>
          </div>
          <div class="page-external-links">
            <h4>Links to External Resources</h4>
            <ul>${externalLinks}</ul>
          </div>
          <div class="page-image">
            <h4>Screenshot</h4>
            <a href="${sitemap[i].url}"><img src="./img/${sitemap[i].image}" width="300" loading="lazy"></a>
          </div>
        </div>
        <hr size="3">
      </div>
    `
  } // for

  let DROPDOWN_HTML = '<select onchange="anchor(this.value)">'
  for (let i=0,cnt=dropdown.length; i<cnt; i++) {
    DROPDOWN_HTML += `<option value="${dropdown[i].link}">${dropdown[i].title}</option>`
  }
  DROPDOWN_HTML += '</select></div>'

  HTML = HEAD + DROPDOWN_HTML + HTML + '</bdoy></html>'

  fs.writeFileSync(`${projectDir}/index.html`, HTML)

  console.log(chalk.green(`Built project HTML page.`))
} // main

// Application Start-Up =====================================================//

main()
