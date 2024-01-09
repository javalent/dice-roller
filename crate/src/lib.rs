mod obsidian;
use js_sys::JsString;
use logos::Logos;
use wasm_bindgen::prelude::*;

mod parsing;
use ast::AST;
use parsing::{ast, calculator, lexer, parser};

#[derive(Logos, Debug, PartialEq)]
#[logos(skip r"[ \t\n\f]+")] // Ignore this regex pattern between tokens
enum Token {
    // Tokens can be literal strings, of any length.
    #[token("fast")]
    Fast,

    #[token(".")]
    Period,

    // Or regular expressions.
    #[regex("[a-zA-Z]+")]
    Text,
}
#[wasm_bindgen]
pub struct ExampleCommand {
    id: JsString,
    name: JsString,
}

#[wasm_bindgen]
impl ExampleCommand {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> JsString {
        self.id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_id(&mut self, id: &str) {
        self.id = JsString::from(id)
    }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> JsString {
        self.name.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_name(&mut self, name: &str) {
        self.name = JsString::from(name)
    }

    pub fn callback(&self) {
        obsidian::Notice::new("hello from rust");
    }
}

#[wasm_bindgen]
pub fn onload(/* plugin: &obsidian::Plugin */) {
    use web_sys::console;
    let mut lex = Token::lexer("help me fast");
    while let Some(token) = lex.next() {
        match token {
            Ok(Token::Text) => console::log_1(&"text".into()),
            Ok(Token::Fast) => console::log_1(&"fast".into()),
            Ok(Token::Period) => console::log_1(&"period".into()),
            Err(_) => todo!(),
        }
    }
}
/// Result that can be calculate from the AST
pub trait FromAST {
    fn from_ast(ast: AST) -> Self;
}

impl FromAST for i32 {
    fn from_ast(ast: AST) -> i32 {
        calculator::calculate(ast)
    }
}

/// Use a parser to calculate the expression.
#[wasm_bindgen]
pub fn calculate(expr: &str) -> i32 {
    let tokens = lexer::lexer(expr).unwrap();
    let ast = parser::parse(tokens).unwrap();
    i32::from_ast(ast)
}
