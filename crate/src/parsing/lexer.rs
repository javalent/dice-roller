use std::fmt;
use std::u64;

use logos::{Lexer, Logos, Span};

static mut ERROR_MSG: String = String::new();

fn parse_int(input: &str, radix: u32, span: Span, raw: &str) -> Option<u64> {
    let input = input.replace("_", "");
    if input.len() == 0 {
        return Some(0);
    }
    match u64::from_str_radix(input.as_str(), radix) {
        Ok(num) => Some(num),
        Err(err) => {
            unsafe {
                ERROR_MSG = format!("Parse int failed: {}\nNear {:?}: {}", err, span, raw);
            }
            None
        }
    }
}

fn bin_int(lex: &mut Lexer<Token>) -> Option<u64> {
    let slice = lex.slice();
    parse_int(&slice[2..], 2, lex.span(), slice)
}

fn oct_int(lex: &mut Lexer<Token>) -> Option<u64> {
    let slice = lex.slice();
    parse_int(&slice[2..], 8, lex.span(), slice)
}

fn dec_int(lex: &mut Lexer<Token>) -> Option<u64> {
    let slice = lex.slice();
    parse_int(slice, 10, lex.span(), slice)
}

fn hex_int(lex: &mut Lexer<Token>) -> Option<u64> {
    let slice = lex.slice();
    parse_int(&slice[2..], 16, lex.span(), slice)
}

/// Token of the calculator lexical structure.
#[derive(Logos, Debug, PartialEq, Clone, Copy)]
pub enum Token {
    #[regex(r"[ \t]+", logos::skip)]
    Error,

    /// Lexer will stop while meet the `NewLine`
    #[regex(r"[\n\f]+")]
    NewLine,

    #[token("+")]
    Plus,

    #[token("-")]
    Minus,

    #[token("*")]
    Times,

    #[token("/")]
    Division,

    #[token("(")]
    LP,

    #[token(")")]
    RP,

    /// Number contains `u64` variable, raise an error if overflow
    #[regex(r"[0-9][0-9_]*", dec_int)]
    #[regex(r"0b[0-1_]*", bin_int)]
    #[regex(r"0o[0-7_]*", oct_int)]
    #[regex(r"0x[0-9a-fA-F_]*", hex_int)]
    Number(u64),
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            Token::Plus => write!(f, "+"),
            Token::Minus => write!(f, "-"),
            Token::Times => write!(f, "*"),
            Token::Division => write!(f, "/"),
            Token::LP => write!(f, "("),
            Token::RP => write!(f, ")"),
            Token::Number(num) => write!(f, "{}", num),
            _ => write!(f, "{:?}", self),
        }
    }
}

/// Parse string into tokens. Only parse one line input.
///
/// Parse will stop while meet `\n` or `\f`.
///
/// Return `Err(String)` while input is invalid.
/// # Example
/// ```
/// use wcal::lexer::{lexer, Token};
///
/// let tokens = lexer("12*(0x_1A-0b01)+-0o12/0\n123").unwrap();
/// assert_eq!(tokens, [
///     Token::Number(12),
///     Token::Times,
///     Token::LP,
///     Token::Number(26),
///     Token::Minus,
///     Token::Number(1),
///     Token::RP,
///     Token::Plus,
///     Token::Minus,
///     Token::Number(10),
///     Token::Division,
///     Token::Number(0)
/// ]);
/// ```
pub fn lexer(input: &str) -> Result<Vec<Token>, String> {
    let mut lex = Token::lexer(input);
    let mut tokens: Vec<Token> = Vec::new();
    while let Some(token) = lex.next() {
        match token {
            Err(_) => {
                return Err(format!("Could not lex"));
            }
            Ok(Token::Error) => {
                if lex.slice().len() == 1 {
                    return Err(format!(
                        "Invalid character near {:?}: {}",
                        lex.span(),
                        lex.slice()
                    ));
                } else {
                    unsafe {
                        let err: String = ERROR_MSG.clone();
                        ERROR_MSG = String::new();
                        return Err(err);
                    }
                }
            }
            Ok(Token::NewLine) => break,
            Ok(_) => {
                tokens.push(token.unwrap());
            }
        }
    }
    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_number() {
        let mut lex = Token::lexer("12_3 0b0000_1111 0o00_13 0x00_1a 0x____");

        assert_eq!(lex.next(), Some(Ok(Token::Number(123))));
        assert_eq!(lex.next(), Some(Ok(Token::Number(15))));
        assert_eq!(lex.next(), Some(Ok(Token::Number(11))));
        assert_eq!(lex.next(), Some(Ok(Token::Number(26))));
        assert_eq!(lex.next(), Some(Ok(Token::Number(0))));
        assert_eq!(lex.next(), None);
    }

    #[test]
    fn test_symbol() {
        let mut lex = Token::lexer("+- * / ()");

        assert_eq!(lex.next(), Some(Ok(Token::Plus)));
        assert_eq!(lex.next(), Some(Ok(Token::Minus)));
        assert_eq!(lex.next(), Some(Ok(Token::Times)));
        assert_eq!(lex.next(), Some(Ok(Token::Division)));
        assert_eq!(lex.next(), Some(Ok(Token::LP)));
        assert_eq!(lex.next(), Some(Ok(Token::RP)));
        assert_eq!(lex.next(), None);
    }

    #[test]
    fn test_overflow() {
        let mut lex = Token::lexer("123456789123456789123456789123456789");

        assert_eq!(lex.next(), Some(Ok(Token::Error)));
        assert_eq!(lex.span(), 0..36);
    }

    #[test]
    fn test_mismatch() {
        let mut lex = Token::lexer("0abc");

        assert_eq!(lex.next(), Some(Ok(Token::Number(0))));
        assert_eq!(lex.next(), Some(Ok(Token::Error)));
        assert_eq!(lex.span(), 1..2);
        assert_eq!(lex.slice().len(), 1);
    }

    #[test]
    fn test_lexer() -> Result<(), String> {
        let tokens = lexer("12*(0x_1A-0b01)+-0o12/0\n123")?;
        assert_eq!(
            tokens,
            [
                Token::Number(12),
                Token::Times,
                Token::LP,
                Token::Number(26),
                Token::Minus,
                Token::Number(1),
                Token::RP,
                Token::Plus,
                Token::Minus,
                Token::Number(10),
                Token::Division,
                Token::Number(0)
            ]
        );

        Ok(())
    }

    #[test]
    fn test_lexer_error() {
        let res = lexer("123456789123456789123456789123456789");
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Parse int failed: number too large to fit in target type\nNear 0..36: 123456789123456789123456789123456789");

        let res = lexer("0+a");
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Invalid character near 2..3: a");
    }
}
