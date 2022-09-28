/* eslint-disable max-lines */
import { useDrop } from 'react-dnd';
import { IntlShape } from 'react-intl';

import { BoardGroup } from '../../blocks/board';
import { BoardView } from '../../blocks/boardView';
import { Card } from '../../blocks/card';
import mutator from '../../mutator';
import Button from '../../widgets/buttons/button';
import ShowIcon from '../../widgets/icons/show';
import Label from '../../widgets/label';
import Menu from '../../widgets/menu';
import MenuWrapper from '../../widgets/menuWrapper';

type Props = {
    activeView: BoardView
    group: BoardGroup
    intl: IntlShape
    readOnly: boolean
    onDrop: (card: Card) => void
}

export default function KanbanHiddenColumnItem (props: Props): JSX.Element {
  const { activeView, intl, group } = props;
  const [{ isOver }, drop] = useDrop<Card, any, { isOver: boolean }>(() => ({
    accept: 'card',
    collect: (monitor) => ({
      isOver: monitor.isOver()
    }),
    drop: (item) => {
      props.onDrop(item);
    }
  }), [props.onDrop]);

  let className = 'octo-board-hidden-item';
  if (isOver) {
    className += ' dragover';
  }

  return (
    <div
      ref={drop}
      key={group.option.id || 'empty'}
      className={className}
    >
      <MenuWrapper
        disabled={props.readOnly}
      >
        <Label
          key={group.option.id || 'empty'}
          color={group.option.color}
        >
          {group.option.value}
        </Label>
        <Menu>
          <Menu.Text
            id='show'
            icon={<ShowIcon />}
            name={intl.formatMessage({ id: 'BoardComponent.show', defaultMessage: 'Show' })}
            onClick={() => mutator.unhideViewColumn(activeView, group.option.id)}
          />
        </Menu>
      </MenuWrapper>
      <Button>{`${group.cards.length}`}</Button>
    </div>
  );
}

