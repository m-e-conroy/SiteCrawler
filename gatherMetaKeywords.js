// Imports ==================================================================//

import fs from 'fs'
import chalk from 'chalk'
import figlet from 'figlet'
import inquirer from 'inquirer'
import { exit } from 'process'

// Variables ================================================================//

let sitemap, keywords

// Functions ================================================================//

function questions () {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter project name to extract keywords: ',
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
  console.log(chalk.blue(figlet.textSync('Keywords', {})))

  const userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())
  
  const projectDir = `projects/${userAnswers.projectName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`
  const imgDir = `${projectDir}/img`

   try {
    sitemap = JSON.parse(fs.readFileSync(`${projectDir}/sitemap.json`))
  } catch (error) {
    console.error(chalk.red(`Error reading sitemap: ${error.message}`))
    exit()
  }

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

  console.log(chalk.bgMagentaBright.black(`Extracting keywords from sitemap`))
  keywords = sitemap.map(page => {
    return {
      page: page.title,
      url: page.url,
      keywords: page?.metaData?.keywords ? page.metaData.keywords.split(',').map(k => k.trim()) : []
    }
  })

  let uniqueKeywords = keywords.reduce((acc, curr) => {
    return [...acc,...curr.keywords]
  }, [])
  uniqueKeywords = [...new Set(uniqueKeywords)].sort()

  fs.writeFileSync(`${projectDir}/metaKeywords.json`, JSON.stringify({ uniqueKeywords, pages: { ...keywords } }, null, 2))
  console.log(chalk.green(`Meta keywords extracted and saved to ${projectDir}/metaKeywords.json`))
  console.log(chalk.bgGreenBright.black(`Meta extraction completed successfully!`))
  exit(0)
} // main

// Start the script
main()
