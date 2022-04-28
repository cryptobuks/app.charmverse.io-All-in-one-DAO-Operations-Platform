// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage} from 'react-intl'
import {
    // AutoSizer,
    // CellMeasurer,
    // CellMeasurerCache,
    // createMasonryCellPositioner,
    // Masonry,
    WindowScroller,
  } from 'react-virtualized';
import AutoSizer from 'react-virtualized-auto-sizer';

import {Constants} from '../../constants'
import {Card} from '../../blocks/card'
import {Board, IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import mutator from '../../mutator'
import {Utils} from '../../utils'

import GalleryCard from './galleryCard'
import { VariableSizeGrid as Grid } from 'react-window';
import styled from '@emotion/styled';

const StyledGrid = styled(Grid)`
  box-sizing: content-box;
  * {
    box-sizing: content-box;
  }
`;

type Props = {
    board: Board
    cards: Card[]
    activeView: BoardView
    boardRef: React.MutableRefObject<HTMLDivElement | undefined>
    readonly: boolean
    addCard: (show: boolean) => Promise<void>
    selectedCardIds: string[]
    onCardClicked: (e: React.MouseEvent, card: Card) => void
}

const GUTTER_SIZE = 10;

const Gallery = (props: Props): JSX.Element => {
    const {activeView, board, cards, boardRef} = props

    const visiblePropertyTemplates =
        activeView.fields.visiblePropertyIds.map((id) => board.fields.cardProperties.find((t) => t.id === id)).filter((i) => i) as IPropertyTemplate[]
    const isManualSort = activeView.fields.sortOptions.length === 0

    const onDropToCard = (srcCard: Card, dstCard: Card) => {
        Utils.log(`onDropToCard: ${dstCard.title}`)
        const {selectedCardIds} = props

        const draggedCardIds = Array.from(new Set(selectedCardIds).add(srcCard.id))
        const description = draggedCardIds.length > 1 ? `drag ${draggedCardIds.length} cards` : 'drag card'

        // Update dstCard order
        let cardOrder = Array.from(new Set([...activeView.fields.cardOrder, ...cards.map((o) => o.id)]))
        const isDraggingDown = cardOrder.indexOf(srcCard.id) <= cardOrder.indexOf(dstCard.id)
        cardOrder = cardOrder.filter((id) => !draggedCardIds.includes(id))
        let destIndex = cardOrder.indexOf(dstCard.id)
        if (isDraggingDown) {
            destIndex += 1
        }
        cardOrder.splice(destIndex, 0, ...draggedCardIds)

        mutator.performAsUndoGroup(async () => {
            await mutator.changeViewCardOrder(activeView, cardOrder, description)
        })
    }

    const visibleTitle = activeView.fields.visiblePropertyIds.includes(Constants.titleColumnId)
    const visibleBadges = activeView.fields.visiblePropertyIds.includes(Constants.badgesColumnId)

    const grid = React.useRef<any>(null);
    console.log(cards.length)
    // <div className='Gallery'>

    function handleScroll ({ scrollTop }: { scrollTop: number }) {
        grid.current?.scrollTo({ scrollTop });
    }

    const [scrollElement, setScrollElement] = React.useState<HTMLDivElement | null>(null)

    const sizeMap = React.useRef<Record<number, number>>({});

    const setRowHeight = React.useCallback((rowIndex: number, height: number) => {
        const existing = sizeMap.current[rowIndex];
        console.log(rowIndex, height, existing)
        if ((sizeMap.current && grid.current) && (!existing || height > existing)) {
            sizeMap.current = { ...sizeMap.current, [rowIndex]: height };
            grid.current.resetAfterRowIndex(rowIndex);
        }
    }, []);

    const colCount = 3;
    const columnWidth = 280 + GUTTER_SIZE;
    const estimatedRowHeight = 200 + GUTTER_SIZE;

    const getSize = (index: number) => {
        return sizeMap.current[index] || estimatedRowHeight;
    };

    React.useLayoutEffect(() => {
        setScrollElement(boardRef.current!);
    })

    if (!scrollElement) {
        return <></>;
    }

    return (
        <>
        <WindowScroller onScroll={handleScroll} scrollElement={scrollElement}>
          {(props) => {
              console.log('window scroller', props)
              return <div />
        }}
        </WindowScroller>
        <div style={{ boxSizing: 'content-box', minHeight: '100%', paddingBottom: 500 }}>
        <AutoSizer onResize={props => console.log('onResize', props)}>
            {({ height, width }) => (
                <StyledGrid
                    ref={grid}
                    columnCount={colCount}
                    columnWidth={() => columnWidth}
                    estimatedColumnWidth={columnWidth}
                    estimatedRowHeight={estimatedRowHeight}
                    //rowHeight={220 + GUTTER_SIZE}
                    rowHeight={getSize}
                    rowCount={Math.floor(cards.length / colCount)}
                    innerElementType={innerElementType}
                    height={window.innerHeight}
                    width={width}
                    style={{ height: '100% !important' }}
                >
                    {({columnIndex, rowIndex,  style}) => {
                        console.log('autosize height', height)
                        const cardIndex = (columnIndex * colCount) + rowIndex;
                        const card = cards[cardIndex];
                        if (!card) {
                            return <div style={style}></div>;
                        }
                        return (

                                <GalleryCard
                                    card={card}
                                    key={card.id + card.updatedAt}
                                    board={board}
                                    onClick={props.onCardClicked}
                                    visiblePropertyTemplates={visiblePropertyTemplates}
                                    visibleTitle={visibleTitle}
                                    visibleBadges={visibleBadges}
                                    isSelected={props.selectedCardIds.includes(card.id)}
                                    readonly={props.readonly}
                                    onDrop={onDropToCard}
                                    isManualSort={isManualSort}
                                    rowIndex={rowIndex}
                                    setRowHeight={setRowHeight}
                                    style={{
                                        ...style,
                                        left: style.left as number + GUTTER_SIZE,
                                        top: style.top as number + GUTTER_SIZE,
                                        width: style.width as number - GUTTER_SIZE,
                                        height: style.height as number - GUTTER_SIZE,
                                        boxSizing: 'border-box'

                                    }}
                                />
                        );
                    }}
                </StyledGrid>
            )}
        </AutoSizer>
        </div>

            {/* Add New row */}

            {/* {!props.readonly &&
                <div
                    className='octo-gallery-new'
                    onClick={() => {
                        props.addCard(true)
                    }}
                >
                    <FormattedMessage
                        id='TableComponent.plus-new'
                        defaultMessage='+ New'
                    />
                </div>
            } */}
            </>
    )
}

const innerElementType = React.forwardRef(({ style, ...rest }: any, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        paddingLeft: GUTTER_SIZE,
        paddingTop: GUTTER_SIZE
      }}
      {...rest}
    />
  ));

export default Gallery
