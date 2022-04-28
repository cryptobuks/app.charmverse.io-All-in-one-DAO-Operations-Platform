// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage} from 'react-intl'
import {
    AutoSizer,
    CellMeasurer,
    CellMeasurerCache,
    createMasonryCellPositioner,
    Masonry,
    WindowScroller,
  } from 'react-virtualized';

import {Constants} from '../../constants'
import {Card} from '../../blocks/card'
import {Board, IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import mutator from '../../mutator'
import {Utils} from '../../utils'

import GalleryCard from './galleryCard'
import { cachedDataVersionTag } from 'node:v8';

// Default sizes help Masonry decide how many images to batch-measure
const cache = new CellMeasurerCache({
    defaultHeight: 220,
    defaultWidth: 280,
    fixedWidth: true,
});

type Props = {
    board: Board
    cards: Card[]
    activeView: BoardView
    readonly: boolean
    addCard: (show: boolean) => Promise<void>
    selectedCardIds: string[]
    onCardClicked: (e: React.MouseEvent, card: Card) => void
}

const Gallery = (props: Props): JSX.Element => {
    const {activeView, board, cards} = props

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

    const cellPositioner = createMasonryCellPositioner({
        cellMeasurerCache: cache,
        columnCount: 4,
        columnWidth: 280,
        spacer: 10,
    });


    return (
        <div className='Gallery'>
            <WindowScroller overscanByPixels={0}>
                {({ height, scrollTop }) => (
                    <AutoSizer disableHeight>
                        {({ width }) => (
                            <Masonry
                                autoHeight={true}
                                cellCount={cards.length}
                                cellMeasurerCache={cache}
                                cellPositioner={cellPositioner}
                                cellRenderer={({index, key, parent, style}) => {
                                    const card = cards[index];
                                    console.log(key)
                                    return (
                                        <CellMeasurer cache={cache} index={index} key={key} parent={parent}>
                                            <GalleryCard
                                                card={card}
                                                board={board}
                                                onClick={props.onCardClicked}
                                                visiblePropertyTemplates={visiblePropertyTemplates}
                                                visibleTitle={visibleTitle}
                                                visibleBadges={visibleBadges}
                                                isSelected={props.selectedCardIds.includes(card.id)}
                                                readonly={props.readonly}
                                                onDrop={onDropToCard}
                                                isManualSort={isManualSort}
                                                style={style}
                                            />
                                        </CellMeasurer>
                                    );
                                }}
                                height={height}
                                overscanByPixels={0}
                                //ref={this._setMasonryRef}
                                scrollTop={scrollTop}
                                width={width}
                            />
                        )}
                    </AutoSizer>
                )}
            </WindowScroller>

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
        </div>
    )
}

export default Gallery
