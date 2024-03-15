/******************************************************************************
 * Simple Server
 * @description Simple server for serving up a projects directory.
 *****************************************************************************/

// Imports ==================================================================//

import http from "http"
import fs from "fs"
import path from "path"
import inquirer from "inquirer"
import chalk from "chalk"

// Functions ================================================================//


// Start-up & Server  =======================================================//

inquirer
  .prompt([
    {
      type: "input",
      name: "projectName",
      message: "What project should I serve?",
      default: "Admissions"
    }
  ])
  .then(userAnswers => {
    const projectDir = `projects/${userAnswers.projectName
      .replace(/[^a-zA-Z]/g, "-")
      .toLowerCase()}`

    http
      .createServer((req, res) => {
        console.log(chalk.bgBlueBright(`Requested: ${req.url}`))
        const filePath = path.join(projectDir, req.url)

        fs.stat(filePath, (err, stats) => {
          if (err) {
            res.writeHead(404)
            res.end(JSON.stringify(err))
            return
          }

          if (stats.isDirectory()) {
            fs.readdir(filePath, (readErr, files) => {
              if(readErr) {              
                res.writeHead(404)
                res.end(JSON.stringify(readErr))
                return
              }

              let fileLinks = files.map(file => `<a href="${file}">${file}</a><br>`)
              console.log(chalk.green(`Serving up directory: ${req.url}`))
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(fileLinks.join(''))
            }) // fs.readdir
          } else {
            fs.readFile(filePath, (fileErr, data) => {
              if (fileErr) {
                res.writeHead(404)
                res.end(JSON.stringify(fileErr))
                return
              }
              console.log(chalk.green(`Serving up file: ${req.url}`))
              res.writeHead(200)
              res.end(data)
            }) // fs.readFileSync
          } // if (stats.isDirectory)
        }) // fs.stat

      })
      .listen(8080) // http.createServer

    console.log(`Server running at http://localhost:8080/`)
    console.log(`Serving files from: ${projectDir}`)
  })
