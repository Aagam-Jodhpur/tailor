# Tailor

A library responsible for generating outfit images with different textures

This library does not have a stable release yet.
Expect major on a nightly basis.

## Install

The library is available on GitHub only. Not hosted on NPM.

### If you use GitHub HTTPS auth

`npm i Aagam-Jodhpur/tailor`

OR the more explicit: `npm i git+https://github.com/Aagam-Jodhpur/tailor.git`

### If you use GitHub SSH auth

`npm i git+ssh://git@github.com/Aagam-Jodhpur/tailor.git`

## Usage and Documentation

> TODO

## Local development setup

- Clone the repo
- `npm i`
- Duplicate the file `.env.sample`. Rename the copy to just `.env`.
- `npm run dev`

## Testing in the browser

### Setup

- Clone the `@aagam/tailor-examples` repo
- From inside the tailor library's directory: `npm link`
- From inside the `@aagam/tailor-examples` directory: `npm run useTailor:local`

Now, the `@aagam/tailor-examples` project will use your local copy of the Tailor library.

Launch any example and test your modifications in the browser.

> **IMPORTANT**: Everytime you execute `npm i <some-package>`, the local tailor copy will be replaced automatically.
> Thus, the command `npm run useTailor:local` should be executed after every `npm i <some-package>`

If you want to use the remote version of the Tailor library again: `npm run useTailor:remote`

### Teardown

- From inside the `@aagam/tailor-examples` directory: `npm run useTailor:remote`
- `npm rm -g @aagam/tailor`
