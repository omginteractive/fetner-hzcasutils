/* eslint-env jest, browser */
import getContainingElement from '../src/getContainingElement';

describe('getContainingElement', () => {
  it.each<unknown>([null, false, 0, 1, {}])(
    'returns `null` for invalid node `%s`',
    (input) => {
      expect(
        (getContainingElement as (...args: unknown[]) => null)(input),
      ).toBeNull();
    },
  );

  it('returns document element by default', () => {
    const node = document.createElement('div');
    expect(getContainingElement(node)).toBe(document.documentElement);
  });

  describe.each<string>(['static', 'relative', 'sticky'])(
    `position: %s`,
    (position) => {
      it.each<string>(['fixed', 'absolute'])(
        'returns ancestor with `position: %s`',
        (input) => {
          const container = document.createElement('span');
          container.style.position = input;
          document.body.appendChild(container);
          const node = document.createElement('div');
          node.style.position = position;
          container.appendChild(node);
          expect(getContainingElement(node)).toBe(container);
        },
      );

      it.each<string>(['static', 'relative', 'sticky'])(
        'ignores inline ancestor with `position: %s`',
        (input) => {
          const container = document.createElement('span');
          container.style.position = input;
          document.body.appendChild(container);
          const node = document.createElement('div');
          node.style.position = position;
          container.appendChild(node);
          expect(getContainingElement(node)).toBe(document.body);
        },
      );

      it.each<string>(['static', 'relative', 'sticky'])(
        'returns block ancestor with `position: %s`',
        (input) => {
          const container = document.createElement('span');
          container.style.display = 'block';
          container.style.position = input;
          document.body.appendChild(container);
          const node = document.createElement('div');
          node.style.position = position;
          container.appendChild(node);
          expect(getContainingElement(node)).toBe(container);
        },
      );

      it.each<string>([
        'block',
        'inline-block',
        'flex',
        'inline-flex',
        'grid',
        'inline-grid',
        'list-item',
        'table',
        'inline-table',
        'table-cell',
        'table-caption',
        'flow-root',
      ])('returns ancestor with `display: %s`', (input) => {
        const container = document.createElement('span');
        container.style.display = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = position;
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(container);
      });

      it.each<string>([
        'inline',
        'contents',
        'run-in',
        'table-column-group',
        'table-header-group',
        'table-footer-group',
        'table-row-group',
        'table-column',
        'table-row',
        'none',
      ])('ignores ancestor with `display: %s`', (input) => {
        const container = document.createElement('span');
        container.style.display = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = position;
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(document.body);
      });

      describe.each<string>([
        'flex',
        'inline-flex',
        'grid',
        'inline-grid',
        'table',
        'inline-table',
      ])('display: %s', (display) => {
        it.each<string>(['flex', 'inline-flex', 'grid', 'inline-grid'])(
          `ignores ancestor with \`display: ${display}\` when it is a child of a %s container`,
          (input) => {
            const container = document.createElement('span');
            container.style.display = input;
            document.body.appendChild(container);
            const subContainer = document.createElement('span');
            subContainer.style.display = display;
            container.appendChild(subContainer);
            const node = document.createElement('div');
            node.style.position = position;
            subContainer.appendChild(node);
            expect(getContainingElement(node)).toBe(container);
          },
        );
      });

      it.each<string>(['left', 'right'])(
        'returns ancestor with `float: %s`',
        (input) => {
          const container = document.createElement('span');
          container.style.float = input;
          document.body.appendChild(container);
          const node = document.createElement('div');
          node.style.position = position;
          container.appendChild(node);
          expect(getContainingElement(node)).toBe(container);
        },
      );

      it('ignores ancestor with `float: none`', () => {
        const container = document.createElement('span');
        container.style.float = 'none';
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = position;
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(document.body);
      });
    },
  );

  describe('position: fixed', () => {
    it.each<string>(['static', 'relative', 'fixed', 'absolute', 'sticky'])(
      'ignores a `position: %s` ancestor',
      (input) => {
        const container = document.createElement('div');
        container.style.position = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = 'fixed';
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(document.documentElement);
      },
    );

    it.each<string>([
      'matrix(1.0, 2.0, 3.0, 4.0, 5.0, 6.0);',
      'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);',
      'perspective(17px);',
      'rotate(0.5turn);',
      'rotate3d(1, 2.0, 3.0, 10deg);',
      'rotateX(10deg);',
      'rotateY(10deg);',
      'rotateZ(10deg);',
      'translate(12px, 50%);',
      'translate3d(12px, 50%, 3em);',
      'translateX(2em);',
      'translateY(3in);',
      'translateZ(2px);',
      'scale(2, 0.5);',
      'scale3d(2.5, 1.2, 0.3);',
      'scaleX(2);',
      'scaleY(0.5);',
      'scaleZ(0.3);',
      'skew(30deg, 20deg);',
      'skewX(30deg);',
      'skewY(1.07rad);',
      'translateX(10px) rotate(10deg) translateY(5px);',
      'perspective(500px) translate(10px, 0, 20px) rotateY(3deg);',
    ])('returns ancestor with `transform: %s`', (input) => {
      const container = document.createElement('div');
      container.style.transform = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'fixed';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });

    it('ignores ancestor with `transform: none`', () => {
      const container = document.createElement('div');
      container.style.transform = 'none';
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'fixed';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(document.documentElement);
    });

    it.each(['auto', 'scroll', 'contents', 'opacity', 'left, top'])(
      'ignores `will-change: %s` ancestors',
      (input) => {
        const container = document.createElement('div');
        container.style.willChange = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = 'fixed';
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(document.documentElement);
      },
    );

    it.each<string>([
      'transform',
      'transform, opacity',
      'scroll-position, transform',
      'right, scroll-position,transform, left',
    ])('returns ancestor with `will-change: %s`', (input) => {
      const container = document.createElement('div');
      container.style.transform = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'fixed';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });

    it('ignores ancestors with `filter: none`', () => {
      const container = document.createElement('div');
      container.style.filter = 'none';
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'fixed';
      expect(getContainingElement(node)).toBe(document.documentElement);
    });

    it.each<string>([
      'url("filters.svg#filter-id");',
      'blur(5px);',
      'brightness(0.4);',
      'contrast(200%);',
      'drop-shadow(16px 16px 20px blue);',
      'grayscale(50%);',
      'hue-rotate(90deg);',
      'invert(75%);',
      'opacity(25%);',
      'saturate(30%);',
      'sepia(60%);',
      'contrast(175%) brightness(3%);',
    ])('returns ancestor with `filter %s`', (input) => {
      const container = document.createElement('div');
      container.style.filter = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'fixed';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });
  });

  describe('position: absolute', () => {
    it.each<string>(['relative', 'fixed', 'absolute', 'sticky'])(
      'returns the closest `position: %s` ancestor',
      (input) => {
        const container = document.createElement('div');
        container.style.position = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = 'absolute';
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(container);
      },
    );

    it('ignores `position: static` ancestors', () => {
      const container = document.createElement('div');
      container.style.position = 'static';
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(document.documentElement);
    });

    it.each<string>([
      'matrix(1.0, 2.0, 3.0, 4.0, 5.0, 6.0);',
      'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);',
      'perspective(17px);',
      'rotate(0.5turn);',
      'rotate3d(1, 2.0, 3.0, 10deg);',
      'rotateX(10deg);',
      'rotateY(10deg);',
      'rotateZ(10deg);',
      'translate(12px, 50%);',
      'translate3d(12px, 50%, 3em);',
      'translateX(2em);',
      'translateY(3in);',
      'translateZ(2px);',
      'scale(2, 0.5);',
      'scale3d(2.5, 1.2, 0.3);',
      'scaleX(2);',
      'scaleY(0.5);',
      'scaleZ(0.3);',
      'skew(30deg, 20deg);',
      'skewX(30deg);',
      'skewY(1.07rad);',
      'translateX(10px) rotate(10deg) translateY(5px);',
      'perspective(500px) translate(10px, 0, 20px) rotateY(3deg);',
    ])('returns ancestor with `transform: %s`', (input) => {
      const container = document.createElement('div');
      container.style.transform = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });

    it('ignores ancestor with `transform: none`', () => {
      const container = document.createElement('div');
      container.style.transform = 'none';
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(document.documentElement);
    });

    it.each(['auto', 'scroll', 'contents', 'opacity', 'left, top'])(
      'ignores `will-change: %s` ancestors',
      (input) => {
        const container = document.createElement('div');
        container.style.willChange = input;
        document.body.appendChild(container);
        const node = document.createElement('div');
        node.style.position = 'absolute';
        container.appendChild(node);
        expect(getContainingElement(node)).toBe(document.documentElement);
      },
    );

    it.each<string>([
      'transform',
      'transform, opacity',
      'scroll-position, transform',
      'right, scroll-position,transform, left',
    ])('returns ancestor with `will-change: %s`', (input) => {
      const container = document.createElement('div');
      container.style.transform = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });

    it('ignores ancestors with `filter: none`', () => {
      const container = document.createElement('div');
      container.style.filter = 'none';
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      expect(getContainingElement(node)).toBe(document.documentElement);
    });

    it.each<string>([
      'url("filters.svg#filter-id");',
      'blur(5px);',
      'brightness(0.4);',
      'contrast(200%);',
      'drop-shadow(16px 16px 20px blue);',
      'grayscale(50%);',
      'hue-rotate(90deg);',
      'invert(75%);',
      'opacity(25%);',
      'saturate(30%);',
      'sepia(60%);',
      'contrast(175%) brightness(3%);',
    ])('returns ancestor with `filter %s`', (input) => {
      const container = document.createElement('div');
      container.style.filter = input;
      document.body.appendChild(container);
      const node = document.createElement('div');
      node.style.position = 'absolute';
      container.appendChild(node);
      expect(getContainingElement(node)).toBe(container);
    });
  });

  it('returns iframe document element', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const node = (iframe.contentDocument as Document).createElement('div');
    const result = getContainingElement(node);
    expect(result).not.toBeNull();
    expect(result).not.toBe(document.documentElement);
    expect(result).toBe(iframe.contentDocument?.documentElement);
  });
});
