import dedent from 'ts-dedent';
import {rules, Rule, rulesDict, Example} from './rules';
import {escapeRegExp, getDisabledRules, yamlRegex} from './utils';

describe('Examples pass', () => {
  for (const rule of rules) {
    describe(rule.name, () => {
      test.each(rule.examples)('$description', (example: Example) => {
        const options = rule.getDefaultOptions();
        if (example.options) {
          Object.assign(options, example.options);
        }
        expect(rule.apply(example.before, options)).toBe(example.after);
      });
    });
  }
});

describe('Augmented examples pass', () => {
  for (const rule of rules) {
    describe(rule.name, () => {
      test.each(rule.examples)('$description', (example: Example) => {
        const options = rule.getDefaultOptions();
        if (example.options) {
          Object.assign(options, example.options);
        }

        // Add a YAML
        if (rule.type !== 'YAML' && !example.before.match(yamlRegex)) {
          const yaml = dedent`
            ---
            foo: bar
            ---\n\n`;

          const before = yaml + example.before;
          expect(rule.apply(before, options)).toMatch(new RegExp(`${escapeRegExp(yaml)}\n?${escapeRegExp(example.after)}`));
        }
      });
    });
  }
});

describe('Check missing fields', () => {
  test.each(rules)('$name', (rule: Rule) => {
    expect(rule.name).toBeTruthy();
    expect(rule.description).toBeTruthy();
    expect(rule.examples.length).toBeGreaterThan(0);
  });
});

describe('Rules tests', () => {
  describe('Heading blank lines', () => {
    it('Ignores codeblocks', () => {
      const before = dedent`
        ---
        front matter
        ---
        
        # H1
        \`\`\`
        # comment not header
        a = b
        \`\`\``;
      const after = dedent`
        ---
        front matter
        ---

        # H1

        \`\`\`
        # comment not header
        a = b
        \`\`\``;
      expect(rulesDict['heading-blank-lines'].apply(before)).toBe(after);
    });
    it('Ignores # not in headings', () => {
      const before = dedent`
        Not a header # .
        Line
        \`\`\`
        # comment not header
        a = b
        \`\`\`
        ~~~
        # comment not header
        ~~~
          # tabbed not header
            # space not header
        `;
      const after = dedent`
        Not a header # .
        Line
        \`\`\`
        # comment not header
        a = b
        \`\`\`
        ~~~
        # comment not header
        ~~~
          # tabbed not header
            # space not header
        `;
      expect(rulesDict['heading-blank-lines'].apply(before)).toBe(after);
    });
    it('Works normally', () => {
      const before = dedent`
        # H1
        ## H2
        Line
        ### H3
        `;
      const after = dedent`
        # H1

        ## H2

        Line
        
        ### H3
        `;
      expect(rulesDict['heading-blank-lines'].apply(before)).toBe(after);
    });
  });
  describe('List spaces', () => {
    it('Handles empty bullets', () => {
      const before = dedent`
        Line
        - 1
        - 
        Line
        `;
      const after = dedent`
        Line
        - 1
        - 
        Line
        `;
      expect(rulesDict['space-after-list-markers'].apply(before)).toBe(after);
    });
  });
  describe('Header Increment', () => {
    it('Handles large increments', () => {
      const before = dedent`
        # H1
        #### H4
        ####### H7
        `;
      const after = dedent`
        # H1
        ## H4
        ### H7
        `;
      expect(rulesDict['header-increment'].apply(before)).toBe(after);
    });
  });
  describe('Capitalize Headings', () => {
    it('Ignores not words', () => {
      const before = dedent`
        # h1
        ## a c++ lan
        ## this is a sentence.
        ## I can't do this
        ## comma, comma, comma
        `;
      const after = dedent`
        # h1
        ## A c++ Lan
        ## This is a Sentence.
        ## I Can't Do This
        ## Comma, Comma, Comma
        `;
      expect(rulesDict['capitalize-headings'].apply(before, {'Style': 'Title Case'})).toBe(after);
    });
  });
  describe('File Name Heading', () => {
    it('Handles stray dashes', () => {
      const before = dedent`
      Text 1

      ---
      
      Text 2
        `;
      const after = dedent`
      # File Name
      Text 1
      
      ---
      
      Text 2
        `;
      expect(rulesDict['file-name-heading'].apply(before, {'metadata: file name': 'File Name'})).toBe(after);
    });
  });
});
describe('Paragraph blank lines', () => {
  it('Ignores codeblocks', () => {
    const before = dedent`
    ---
    front matter
    front matter
    ---

    Hello
    World
    \`\`\`python
    # comment not header
    a = b
    c = d
    \`\`\`
    `;
    const after = dedent`
    ---
    front matter
    front matter
    ---

    Hello

    World

    \`\`\`python
    # comment not header
    a = b
    c = d
    \`\`\`
    `;
    expect(rulesDict['paragraph-blank-lines'].apply(before)).toBe(after);
  });
});
describe('Consecutive blank lines', () => {
  it('Handles ignores code blocks', () => {
    const before = dedent`
      Line 1


      \`\`\`
      


      \`\`\`
      `;
    const after = dedent`
      Line 1

      \`\`\`



      \`\`\`
      `;
    expect(rulesDict['consecutive-blank-lines'].apply(before)).toBe(after);
  });
});

describe('Trailing spaces', () => {
  it('One trailing space removed', () => {
    const before = dedent`
        # H1 
        line with one trailing spaces 
      `;
    const after = dedent`
        # H1
        line with one trailing spaces
      `;
    expect(rulesDict['trailing-spaces'].apply(before)).toBe(after);
  });
  it('Three trailing whitespaces removed', () => {
    const before = dedent`
        # H1   
        line with three trailing spaces   
      `;
    const after = dedent`
        # H1
        line with three trailing spaces
      `;
    expect(rulesDict['trailing-spaces'].apply(before)).toBe(after);
  });
  /* eslint-disable no-mixed-spaces-and-tabs, no-tabs */
  it('Tab-Space-Linebreak removed', () => {
    const before = dedent`
        # H1
        line with trailing tab and spaces    

      `;
    const after = dedent`
        # H1
        line with trailing tab and spaces
        
      `;
    expect(rulesDict['trailing-spaces'].apply(before, {'Style': 'Two Space Linebreak'})).toBe(after);
  });
  /* eslint-enable no-mixed-spaces-and-tabs, no-tabs */
  it('Two Space Linebreak not removed', () => {
    const before = dedent`
        # H1
        line with one trailing spaces  

      `;
    const after = dedent`
        # H1
        line with one trailing spaces  

      `;
    expect(rulesDict['trailing-spaces'].apply(before, {'Style': 'Two Space Linebreak'})).toBe(after);
  });
});

describe('Move Footnotes to the bottom', () => {
  it('Long Document with multiple consecutive footnotes', () => {
    const before = dedent`
   # Part 1
   Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in est.[^1] Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has.[^2] . In pri reque accumsan, quidam noster interpretaris in est.[^3] Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in est.[^4] Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has.[^5]

   [^1]: See @JIPPChristKingPaul2015, 50.
   [^2]: Jipp in -@JIPPChristKingPaul2015, 45, says, “Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has”.
   [^3]: This is from Journal article --@gaventaLouisMartynGalatians2000, 99.
   [^4]: Lorem ipsum dolor sit amet, cibo eripuit consulatu at vim. No quando animal eam, ea timeam ancillae incorrupte usu. Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in es. See @WANRomansIntroductionStudy2021, 45. 
   [^5]: See @johnsonTransformationMindMoral2003, 215.

   No hendrerit efficiendi eam. Vim ne ferri populo voluptatum, et usu laboramus scribentur, per illud inermis consetetur id.[^a]

   Eu graeco blandit instructior pro, ut vidisse mediocrem qui. Ex ferri melius evertitur qui. At nec eripuit legimus.[^b] Ut meis solum recusabo eos, usu in[^c] assueverit eloquentiam, has facilis scribentur ea. No hendrerit efficiendi eam. Vim ne ferri populo voluptatum, et usu laboramus scribentur, per illud inermis consetetur id.[^d]

   [^a]: Footnote 1.
   [^b]: Footnote 2.
   [^c]: Wright in -@wrightPaulFreshPerspective2005 says, “Modo omnes neglegentur cu vel.”
   [^d]: Abraham in -@abrahamPostcolonialTheologies2015, says, “Ei eos deleniti electram. Prima prompta partiendo ius ne.”

   # Part 3
   In has assum falli habemus, timeam apeirian forensibus nam no, mutat facer antiopam in pri. Mel et vocent scribentur.[^11] 

   > In has assum falli habemus, timeam apeirian forensibus nam no, mutat facer antiopam in pri. Te sea stet deserunt, vel tritani eligendi platonem ut, sea ea fugit iriure. Usu at elaboraret scriptorem signiferumque, cetero reprimique est cu. Ei eos deleniti electram. Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^21]

   Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^31]

   Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^41]

   [^11]: See @JIPPMessianicTheologyNew2020
   [^21]: See @jippDivineVisitationsHospitality2013. Dunn in @dunnRomans181988, says, “Mel et vocent scribentur.”
   [^31]: Abraham in -@abrahamPostcolonialTheologies2015, says, “Ei eos deleniti electram. Prima prompta partiendo ius ne.”
   [^41]: Wright in -@wrightPaulFreshPerspective2005 says, “Modo omnes neglegentur cu vel.”
   `;
    const after = dedent`
   # Part 1
   Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in est.[^1] Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has.[^2] . In pri reque accumsan, quidam noster interpretaris in est.[^3] Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in est.[^4] Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has.[^5]

   No hendrerit efficiendi eam. Vim ne ferri populo voluptatum, et usu laboramus scribentur, per illud inermis consetetur id.[^a]

   Eu graeco blandit instructior pro, ut vidisse mediocrem qui. Ex ferri melius evertitur qui. At nec eripuit legimus.[^b] Ut meis solum recusabo eos, usu in[^c] assueverit eloquentiam, has facilis scribentur ea. No hendrerit efficiendi eam. Vim ne ferri populo voluptatum, et usu laboramus scribentur, per illud inermis consetetur id.[^d]

   # Part 3
   In has assum falli habemus, timeam apeirian forensibus nam no, mutat facer antiopam in pri. Mel et vocent scribentur.[^11] 

   > In has assum falli habemus, timeam apeirian forensibus nam no, mutat facer antiopam in pri. Te sea stet deserunt, vel tritani eligendi platonem ut, sea ea fugit iriure. Usu at elaboraret scriptorem signiferumque, cetero reprimique est cu. Ei eos deleniti electram. Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^21]

   Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^31]

   Prima prompta partiendo ius ne. Modo omnes neglegentur cu vel, nisl illum vel ex. Mel et vocent scribentur.[^41]

   [^1]: See @JIPPChristKingPaul2015, 50.
   [^2]: Jipp in -@JIPPChristKingPaul2015, 45, says, “Sale populo petentium vel eu, eam in alii novum voluptatum, te lorem postulant has”.
   [^3]: This is from Journal article --@gaventaLouisMartynGalatians2000, 99.
   [^4]: Lorem ipsum dolor sit amet, cibo eripuit consulatu at vim. No quando animal eam, ea timeam ancillae incorrupte usu. Graece insolens eloquentiam te mea, te novum possit eam. In pri reque accumsan, quidam noster interpretaris in es. See @WANRomansIntroductionStudy2021, 45. 
   [^5]: See @johnsonTransformationMindMoral2003, 215.
   [^a]: Footnote 1.
   [^b]: Footnote 2.
   [^c]: Wright in -@wrightPaulFreshPerspective2005 says, “Modo omnes neglegentur cu vel.”
   [^d]: Abraham in -@abrahamPostcolonialTheologies2015, says, “Ei eos deleniti electram. Prima prompta partiendo ius ne.”
   [^11]: See @JIPPMessianicTheologyNew2020
   [^21]: See @jippDivineVisitationsHospitality2013. Dunn in @dunnRomans181988, says, “Mel et vocent scribentur.”
   [^31]: Abraham in -@abrahamPostcolonialTheologies2015, says, “Ei eos deleniti electram. Prima prompta partiendo ius ne.”
   [^41]: Wright in -@wrightPaulFreshPerspective2005 says, “Modo omnes neglegentur cu vel.”

   `;
    expect(rulesDict['move-footnotes-to-the-bottom'].apply(before)).toBe(after);
  });
});

describe('Disabled rules parsing', () => {
  it('No YAML', () => {
    const text = dedent`
      Text
      `;
    expect(getDisabledRules(text)).toEqual([]);
  });
  it('No ignored rules', () => {
    const text = dedent`
      ---
      ---
      Text
      `;
    expect(getDisabledRules(text)).toEqual([]);
  });
  it('Ignore one rule', () => {
    const text = dedent`
      ---
      disabled rules: [ yaml-timestamp ]
      ---
      Text
      `;
    expect(getDisabledRules(text)).toEqual(['yaml-timestamp']);
  });
  it('Ignore some rules', () => {
    const text = dedent`
      ---
      random-rule: true
      disabled rules: [ yaml-timestamp, capitalize-headings ]
      ---
      Text
      `;
    expect(getDisabledRules(text)).toEqual(['yaml-timestamp', 'capitalize-headings']);
  });
  it('Ignored no rules', () => {
    const text = dedent`
      ---
      disabled rules:
      ---
      Text
      `;
    expect(getDisabledRules(text)).toEqual([]);
  });
  it('Ignored all rules', () => {
    const text = dedent`
      ---
      disabled rules: all
      ---
      Text
      `;
    expect(getDisabledRules(text)).toEqual(rules.map((r) => r.alias()));
  });
});
