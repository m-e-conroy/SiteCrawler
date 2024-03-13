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

  sitemap = fs.readFileSync(`${projectDir}/sitemap.json`)

  console.log(chalk.bgMagentaBright.black(`Building site outline`))

  CSS = `
    <style>
      body { 
        margin: 0;
        padding: 2em;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 16px;
      }
    </style>`

  HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Crawled Site Map</title>${CSS}</head><body><h1>Crawled ${userAnswers.projectName}</h1>`

  for (let i in sitemap) {
    HTML += `
      <div class="page">

      </div>
    `
  } // for

  HTML += '</bdoy></html>'
} // main

// Application Start-Up =====================================================//

main()
