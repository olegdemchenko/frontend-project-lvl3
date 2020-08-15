install:
	npm install
develop:
	npx webpack-dev-server --open --mode development
build:
	rm -rf dist
	npx webpack --mode production
lint:
	npx eslint .

