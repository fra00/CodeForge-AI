import React from 'react';
import Card from '../Card';
import CardHeader from '../CardHeader';
import Avatar from '../Avatar';
import CodeBlock from '../CodeBlock';

/**
 * Componente di esempio per mostrare l'utilizzo del componente Avatar.
 */
const ExampleAvatar = () => {
  const codeSnippet = `
import Avatar from "./Avatar";

// Avatar con immagine e diverse dimensioni
<Avatar src="https://i.pravatar.cc/48?u=mario" alt="Mario Rossi" size="small">MR</Avatar>
<Avatar src="https://i.pravatar.cc/48?u=giulia" alt="Giulia Bianchi" size="medium">GB</Avatar>
<Avatar src="https://i.pravatar.cc/64?u=luigi" alt="Luigi Verdi" size="large">LV</Avatar>

// Avatar con URL immagine non valido (mostra il fallback)
<Avatar src="https://invalid-url" alt="Fallback" size="medium">FB</Avatar>

// Avatar senza immagine (mostra il fallback)
<Avatar alt="Senza Immagine" size="medium">SI</Avatar>
`;

  return (
    <Card>
      <CardHeader>Esempi di Avatar</CardHeader>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}
      >
        <Avatar
          src="https://i.pravatar.cc/48?u=mario"
          alt="Mario Rossi"
          size="small"
        >
          MR
        </Avatar>
        <Avatar
          src="https://i.pravatar.cc/48?u=giulia"
          alt="Giulia Bianchi"
          size="medium"
        >
          GB
        </Avatar>
        <Avatar
          src="https://i.pravatar.cc/64?u=luigi"
          alt="Luigi Verdi"
          size="large"
        >
          LV
        </Avatar>
        <Avatar src="https://invalid-url" alt="Fallback" size="medium">
          FB
        </Avatar>
        <Avatar alt="Senza Immagine" size="medium">
          SI
        </Avatar>
      </div>
      <CodeBlock code={codeSnippet} />
    </Card>
  );
};

export default ExampleAvatar;
