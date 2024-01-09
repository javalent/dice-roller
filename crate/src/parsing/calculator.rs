//! Convert the expression AST to `i32`
//!
//! A warning will raise while division cast happened
//!
//! A error will raise while division by zero
use crate::ast::*;
use crate::lexer::Token;

trait Calculable {
    fn calculate(node: &Self) -> i32;
}

impl Calculable for Expr {
    fn calculate(node: &Self) -> i32 {
        match node {
            Expr::Pair(pair) => Pair::calculate(pair),
            Expr::Operation(expr) => Operation::calculate(expr),
            Expr::Neg(neg) => Neg::calculate(neg),
            Expr::Num(num) => Number::calculate(num),
        }
    }
}

impl Calculable for Operation {
    fn calculate(node: &Self) -> i32 {
        let lval = Expr::calculate(&node.lhs);
        let rval = Expr::calculate(&node.rhs);
        match node.op {
            Token::Plus => lval + rval,
            Token::Minus => lval - rval,
            Token::Times => lval * rval,
            Token::Division => {
                if rval == 0 {
                    eprintln!("Error: division by zero");
                    panic!()
                }
                if lval % rval != 0 {
                    eprintln!("Warning: division will cause a cast");
                }
                lval / rval
            }
            _ => panic!("Unknown operator"),
        }
    }
}

impl Calculable for Number {
    fn calculate(node: &Self) -> i32 {
        node.num as i32
    }
}

impl Calculable for Pair {
    fn calculate(node: &Self) -> i32 {
        Expr::calculate(&node.expr)
    }
}

impl Calculable for Neg {
    fn calculate(node: &Self) -> i32 {
        -Expr::calculate(&node.expr)
    }
}

impl Calculable for AST {
    fn calculate(ast: &Self) -> i32 {
        Expr::calculate(&ast.root)
    }
}

/// Calculate the expression's AST to `i28`
pub fn calculate(ast: AST) -> i32 {
    AST::calculate(&ast)
}

#[cfg(test)]
mod tests {
    use crate::ast::*;
    use crate::calculator::calculate;
    use crate::lexer::Token;
    use crate::parsing::ast::Number;

    #[test]
    fn test_num() {
        let res = calculate(AST {
            root: Number::new(3),
        });
        assert_eq!(res, 3);
    }

    #[test]
    fn test_add() {
        let res = calculate(AST {
            root: Operation::new(Number::new(1), Number::new(2), Token::Plus),
        });
        assert_eq!(res, 3);
    }

    #[test]
    fn test_minus() {
        let res = calculate(AST {
            root: Operation::new(Number::new(1), Number::new(2), Token::Minus),
        });
        assert_eq!(res, -1);
    }

    #[test]
    fn test_times() {
        let res = calculate(AST {
            root: Operation::new(Number::new(1), Number::new(2), Token::Times),
        });
        assert_eq!(res, 2);
    }

    #[test]
    fn test_division() {
        let res = calculate(AST {
            root: Operation::new(Number::new(4), Number::new(2), Token::Division),
        });
        assert_eq!(res, 2);
    }

    #[test]
    fn test_division_cast() {
        let res = calculate(AST {
            root: Operation::new(Number::new(3), Number::new(2), Token::Division),
        });
        assert_eq!(res, 1);
    }

    #[test]
    #[should_panic]
    fn test_division_zero() {
        calculate(AST {
            root: Operation::new(Number::new(3), Number::new(0), Token::Division),
        });
    }

    #[test]
    fn test_neg() {
        // -3
        let res = calculate(AST {
            root: Neg::new(Number::new(3)),
        });
        assert_eq!(res, -3);
        // --3
        let res = calculate(AST {
            root: Neg::new(Neg::new(Number::new(3))),
        });
        assert_eq!(res, 3);
        // --3---3
        let res = calculate(AST {
            root: Operation::new(
                Neg::new(Neg::new(Number::new(3))),
                Neg::new(Neg::new(Number::new(3))),
                Token::Minus,
            ),
        });
        assert_eq!(res, 0);
    }

    #[test]
    fn test_pair() {
        // (3)
        let res = calculate(AST {
            root: Pair::new(Number::new(3)),
        });
        assert_eq!(res, 3);
        // ((3))
        let res = calculate(AST {
            root: Pair::new(Pair::new(Number::new(3))),
        });
        assert_eq!(res, 3);
    }
}
