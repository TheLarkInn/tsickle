import * as ts from 'typescript';

/**
 * A Rewriter manages iterating through a ts.SourceFile, copying input
 * to output while letting the subclass potentially alter some nodes
 * along the way by implementing maybeProcess().
 */
export abstract class Rewriter {
  protected output: string[] = [];
  /** Errors found while examining the code. */
  protected diagnostics: ts.Diagnostic[] = [];
  /**
   * The current level of recursion through TypeScript Nodes.  Used in formatting internal debug
   * print statements.
   */
  private indent: number = 0;

  constructor(protected file: ts.SourceFile) {}

  getOutput(): {output: string, diagnostics: ts.Diagnostic[]} {
    if (this.indent !== 0) {
      throw new Error('visit() failed to track nesting');
    }
    return {output: this.output.join(''), diagnostics: this.diagnostics};
  }

  /**
   * visit traverses a Node, recursively writing all nodes not handled by this.maybeProcess.
   */
  visit(node: ts.Node) {
    // this.logWithIndent('node: ' + ts.SyntaxKind[node.kind]);
    this.indent++;
    if (!this.maybeProcess(node)) this.writeNode(node);
    this.indent--;
  }

  /**
   * maybeProcess lets subclasses optionally processes a node.
   *
   * @return True if the node has been handled and doesn't need to be traversed;
   *    false to have the node written and its children recursively visited.
   */
  protected abstract maybeProcess(node: ts.Node): boolean;

  /** writeNode writes a ts.Node, calling this.visit() on its children. */
  writeNode(node: ts.Node, skipComments = false) {
    if (node.getChildCount() === 0) {
      // Directly write complete tokens.
      if (skipComments) {
        // To skip comments, we skip all whitespace/comments preceding
        // the node.  But if there was anything skipped we should emit
        // a newline in its place so that the node remains separated
        // from the previous node.  TODO: don't skip anything here if
        // there wasn't any comment.
        if (node.getFullStart() < node.getStart()) {
          this.emit('\n');
        }
        this.emit(node.getText());
      } else {
        this.emit(node.getFullText());
      }
      return;
    }
    if (skipComments) {
      throw new Error('skipComments unimplemented for complex Nodes');
    }
    let lastEnd = node.getFullStart();
    for (let child of node.getChildren()) {
      this.writeRange(lastEnd, child.getFullStart());
      this.visit(child);
      lastEnd = child.getEnd();
    }
    // Write any trailing text.
    this.writeRange(lastEnd, node.getEnd());
  }

  // Write a span of the input file as expressed by absolute offsets.
  // These offsets are found in attributes like node.getFullStart() and
  // node.getEnd().
  writeRange(from: number, to: number) {
    // getSourceFile().getText() is wrong here because it has the text of
    // the SourceFile node of the AST, which doesn't contain the comments
    // preceding that node.  Semantically these ranges are just offsets
    // into the original source file text, so slice from that.
    let text = this.file.text.slice(from, to);
    if (text) this.emit(text);
  }

  emit(str: string) { this.output.push(str); }

  /* tslint:disable: no-unused-variable */
  logWithIndent(message: string) {
    /* tslint:enable: no-unused-variable */
    let prefix = new Array(this.indent + 1).join('| ');
    console.log(prefix + message);
  }

  /**
   * Produces a compiler error that references the Node's kind.  This is useful for the "else"
   * branch of code that is attempting to handle all possible input Node types, to ensure all cases
   * covered.
   */
  errorUnimplementedKind(node: ts.Node, where: string) {
    this.error(node, `${ts.SyntaxKind[node.kind]} not implemented in ${where}`);
  }

  error(node: ts.Node, messageText: string, start?: number, length?: number) {
    start = start || node.getStart();
    length = length || (node.getEnd() - start);
    this.diagnostics.push({
      file: this.file,
      start,
      length,
      messageText,
      category: ts.DiagnosticCategory.Error,
      code: undefined,
    });
  }
}
