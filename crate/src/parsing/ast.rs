//! Abstract syntax tree
//!
//! ```text
//! Expr   -> expr
//!
//! Operation  -> expr + expr
//!         | expr - expr
//!         | expr * expr
//!         | expr / expr
//!
//! Neg    -> - expr
//!
//! Pair   -> ( expr )
//!
//! Number -> number
//! ```
use crate::lexer::Token;

/// `expr`
#[derive(Debug, PartialEq)]
pub enum Expr {
    Pair(Pair),
    Operation(Operation),
    Neg(Neg),
    Num(Number),
}

/// `( expr )`
#[derive(Debug, PartialEq)]
pub struct Pair {
    pub expr: Box<Expr>,
}

impl Pair {
    pub fn new(expr: Expr) -> Expr {
        Expr::Pair(Pair {
            expr: Box::new(expr),
        })
    }
}

/// `lhs op rhs`
///
/// op is `+` `-` `*` or `/`
#[derive(Debug, PartialEq)]
pub struct Operation {
    pub lhs: Box<Expr>,
    pub rhs: Box<Expr>,
    pub op: Token,
}

impl Operation {
    pub fn new(lhs: Expr, rhs: Expr, token: Token) -> Expr {
        Expr::Operation(Operation {
            lhs: Box::new(lhs),
            rhs: Box::new(rhs),
            op: token,
        })
    }
}

/// `- expr`
#[derive(Debug, PartialEq)]
pub struct Neg {
    pub expr: Box<Expr>,
}

impl Neg {
    pub fn new(expr: Expr) -> Expr {
        Expr::Neg(Neg {
            expr: Box::new(expr),
        })
    }
}

/// number store as `u64`
#[derive(Debug, PartialEq)]
pub struct Number {
    pub num: u64,
}

impl Number {
    pub fn new(num: u64) -> Expr {
        Expr::Num(Number { num })
    }
}

#[derive(Debug, PartialEq)]
pub struct AST {
    pub root: Expr,
}
