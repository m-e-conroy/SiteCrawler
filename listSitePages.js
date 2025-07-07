// Imports ==================================================================//

import fs from 'fs'
import chalk from 'chalk'
import figlet from 'figlet'
import inquirer from 'inquirer'
import { exit } from 'process'

// Variables ================================================================//

let sitemap

// Functions ================================================================//

function questions () {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter project name to list site pages: ',
          default: 'Admissions',
          validate: val => val != undefined
        }
      ])
      .then(answers => resolve(answers))
      .catch(error => {
        console.error(chalk.red(`Error listing site pages: ${error.message}`))
        reject(error)
      })
  })
} // questions

async function main () {
  console.log(chalk.blue(figlet.textSync('List Site Pages', {})))

  const userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())

  const projectDir = `projects/${userAnswers.projectName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`

  try {
    sitemap = JSON.parse(fs.readFileSync(`${projectDir}/sitemap.json`))
  } catch (error) {
    console.error(chalk.red(`Error reading sitemap: ${error.message}`))
    exit()
  }
  let alreadyListed = []
  sitemap = sitemap
    .map(val => val.url)
    .filter(val => {
      if (!alreadyListed.includes(val.trim())) {
        alreadyListed.push(val.trim())
        return true
      }
      return false
  })

  sitemap = sitemap.sort((a, b) => {
    if (a > b) return 1
    if (a < b) return -1
    return 0
  })

  console.log(chalk.green('Site Pages:'))
  sitemap.forEach(page => {
    console.log(`- ${page}`)
  })

} // main

// Run the main function
main()