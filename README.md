# Tailor

A library responsible for generating outfit images with different textures

## Install

The library is available on GitHub only. Not hosted on NPM.

### If you use GitHub HTTPS auth

`npm i Aagam-Jodhpur/@aagam-tailor`

OR the more explicit: `npm i git+https://github.com/Aagam-Jodhpur/@aagam-tailor.git`

### If you use GitHub SSH auth

`npm i git+ssh://git@github.com/Aagam-Jodhpur/@aagam-tailor.git`

## Usage and Documentation

> TODO

## Local development setup

- Clone the repo
- `npm i`
- Duplicate the file `.env.sample`. Rename the copy to be just `.env`.
- `npm run dev`

### Testing in the browser

#### Setup

- Clone the `@aagam/tailor-examples` repo
- From inside the tailor library's directory: `npm link`
- From inside the `@aagam/tailor-examples` directory: `npm run useTailor:local`

Now, the `@aagam/tailor-examples` project will use your local copy of the Tailor library.

Launch any example and test your modifications in the browser.

If you want to use the remote version of the Tailor library again: `npm run useTailor:remote`

#### Teardown

- From inside the `@aagam/tailor-examples` directory: `npm run useTailor:remote`
- `npm rm -g @aagam/tailor`
