import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Actions, addPopUp, sortLayers } from 'gisida';
import { detectIE, buildLayersObj } from '../../utils';
import './Map.scss';

const mapStateToProps = (state, ownProps) => {
  return {
    APP: state.APP,
    STYLES: state.STYLES,
    REGIONS: state.REGIONS,
    MAP: state.MAP,
    layersObj: buildLayersObj(state.MAP.layers),
    layerObj: state.MAP.layers[state.MAP.activeLayerId],
    primaryLayer: state.MAP.primaryLayer,
  }
}

const isIE = detectIE();

class Map extends Component {
  initMap(accessToken, mapConfig) {
    if (accessToken && mapConfig) {
      mapboxgl.accessToken = accessToken;
      this.map = new mapboxgl.Map(mapConfig);
      this.map.addControl(new mapboxgl.NavigationControl());
  
      // Handle Map Load Event
      this.map.on('load', () => {
        const mapLoaded = true;
        this.addMouseEvents();
        this.setState({ mapLoaded });
        this.props.dispatch(Actions.mapLoaded(true));
      });

      // Handle Style Change Event
      this.map.on('style.load', (e) => {
        let mapLoad = false;
        // Define on map on render listener for current stlye loads
        const onStyleLoad = (e) => {
          // check if map is loaded before reloading layers
          if (e.target.loaded() && mapLoad !== e.target.loaded() && this.props.MAP.isLoaded) {
            mapLoad = true;
            this.props.dispatch(Actions.reloadLayers(Math.random()));
          }
        };
        // remove render listener for previous style.load event
        e.target.off('render', onStyleLoad);
        // add render listener for current style.load event
        e.target.on('render', onStyleLoad);
      });

      // Handle adding/removing labels when zooming
      this.map.on('zoom', this.handleLabelsOnMapZoom.bind(this))

      // Dispach map rendered to indicate map was rendered
      this.props.dispatch(Actions.mapRendered());
    }
  }

  addMouseEvents() {
    addPopUp(this.map, this.props.dispatch);
    // this.addMapClickEvents()
    // this.addMouseMoveEvents()
    // etc
  }

  findNextLayer(activelayersData, nextLayer) {
    return activelayersData.find(lo => lo.id === nextLayer);
  }

  setPrimaryLayer(primaryLayer, activeLayerId, layers, activeLayersData, activelayerObj) {
    const nextLayerId =  primaryLayer || activeLayerId;
    let nextLayerObj = activeLayersData.find(lo => lo.id === nextLayerId);
    if (!nextLayerObj && layers[nextLayerId].layers) {
      let nextLayer;
      for (let l = 0; l < layers[nextLayerId].layers.length; l += 1) {
        nextLayer = layers[nextLayerId].layers[l];
        nextLayerObj = this.findNextLayer(activeLayersData, nextLayer);
        if (nextLayerObj) break;
      }
    }
    if (!nextLayerObj) {
      return false;
    }

    // Move the selected primary layer to the top of the map layers
    if (this.map.getLayer(nextLayerId)) {
      this.map.moveLayer(nextLayerId);
    }
    let layerObj;
    // Loop throught all active map layers
    for (let i = activeLayersData.length - 1; i >= 0; i -= 1) {
      layerObj = activeLayersData[i];
      // If 'layerObj' is not a fill OR the selected primary layer
      if (layerObj.type !== 'fill' && layerObj.id !== nextLayerId) {
        // If 'layerObj' is not the same type as the selected
        if (layerObj.type !== nextLayerObj.type) {
          // Move 'layerObj' to the top of the map layers
          if (this.map.getLayer(layerObj.id)) {
            this.map.moveLayer(layerObj.id);
          }
        }
      }
    }

    // Re-order this.state.layersObj array
    const nextlayersObj = activeLayersData.filter(lo => lo.id !== nextLayerId);
    nextlayersObj.push(nextLayerObj);

    return true;
  }
  
  changeVisibility(layerId, visibility) {
    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, 'visibility', visibility ? 'visible' : 'none');
      // if layer has a highlight layer, update its visibility too
      if (this.map.getLayer(`${layerId}-highlight`)) {
        this.map.setLayoutProperty(`${layerId}-highlight`, 'visibility', visibility ? 'visibile' : 'none');
      }
    }
  }

  componentWillReceiveProps(nextProps){
    const accessToken = nextProps.APP.accessToken;
    const mapConfig = nextProps.APP.mapConfig;
    const isRendered = nextProps.MAP.isRendered;
    const isLoaded = nextProps.MAP.isLoaded;
    const currentStyle = nextProps.MAP.currentStyle;
    const currentRegion = nextProps.MAP.currentRegion;
    const reloadLayers = nextProps.MAP.reloadLayers;
    const activelayersData = nextProps.layersObj;
    const activelayerObj = nextProps.layerObj;
    const primaryLayer = nextProps.MAP.primaryLayer;
    const activeLayerId = nextProps.MAP.activeLayerId;

    const layers = nextProps.MAP.layers;
    const styles = nextProps.STYLES;
    const regions = nextProps.REGIONS;
  

    // Check if map is initialized.
    if (!isRendered && (!isIE || mapboxgl.supported())) {
      this.initMap(accessToken, mapConfig);
    }
    // Check if rendererd map has finished loading
    if (isLoaded) {

      // Set current style (basemap)
      styles.forEach((style) => {
        if (style.current && this.props.MAP.currentStyle !== currentStyle) {
          this.map.setStyle(style.url);
        }
      });

      // Zoom to current region (center and zoom)
      regions.forEach((region) => {
        if (region.current && this.props.MAP.currentRegion !== currentRegion) {
          this.map.easeTo({
            center: region.center,
            zoom: region.zoom,
            duration: 1200
          })
        }
      });

      // Add current layers to map
      if (this.props.MAP.reloadLayers !== reloadLayers) {
        Object.keys(layers).forEach((key) => {
          const layer = layers[key];
          // Add layer to map if visible
          if (!this.map.getLayer(layer.id) && layer.visible && layer.styleSpec) {
            this.map.addLayer(layer.styleSpec);

            // if layer has a highlight layer
            if (layer.filters && layer.filters.highlight) {
              // create a copy of the layer
              const highlightLayer = Object.assign({}, layer.styleSpec);
              // apply layout and paint properties to the highlight layer
              if (layer['highlight-layout']) {
                highlightLayer.layout = Object.assign({}, highlightLayer.layout, layer['highlight-layout']);
              }
              if (layer['highlight-paint']) {
                highlightLayer.paint = Object.assign({}, highlightLayer.paint, layer['highlight-paint']);
              }
              // append suffix to highlight layer id
              highlightLayer.id += '-highlight';
              // add the highlight layer to the map
              this.map.addLayer(highlightLayer);
            }
          } 
          // Change visibility if layer is already on map
          this.changeVisibility(layer.id, layer.visible);
          if (layer.layers) {
            layer.layers.forEach((subLayer) => {
              this.changeVisibility(subLayer, layer.visible);
            });
          }
        });

        sortLayers(this.map, layers);
      }

      if (this.props.MAP.primaryLayer !== primaryLayer) {
        this.setPrimaryLayer(primaryLayer, activeLayerId, layers, activelayersData, activelayerObj);
      }
    }
    // Assign global variable for debugging purposes.
    window.GisidaMap = this.map;

  }

  componentDidUpdate(prevProps, prevState) {
    this.removeLabels();
    this.props.layersObj.forEach(layerObj => {
      if (layerObj.labels && layerObj.labels.labels) {
        this.addLabels(layerObj);
      }
    });
  }

  addLabels(layerObj) {
    let el;
    const { id } = layerObj;
    const { offset, labels } = layerObj.labels;
    for (let l = 0; l < labels.length; l += 1) {
      el = document.createElement('div');
      el.className = `map-label label-${id}`;
      el.innerHTML = labels[l].label;
      new mapboxgl.Marker(el, { offset })
        .setLngLat(labels[l].coordinates)
        .addTo(this.map);
    }
  }

  removeLabels(labelClass) {
    const classItems = document.getElementsByClassName((labelClass || 'map-label'));
    while (classItems[0]) {
      classItems[0].parentNode.removeChild(classItems[0]);
    }
  }

  handleLabelsOnMapZoom() {
    let minZoom;
    let maxZoom;
    let zoom = this.map.getZoom();
    let isRendered;
    this.props.layersObj.forEach(layerObj => {
      if (layerObj.labels) {
        minZoom = layerObj.labels.minZoom || layerObj.labels.minzoom || 0;
        maxZoom = layerObj.labels.maxZoom || layerObj.labels.maxzoom || 22;
        isRendered = (document.getElementsByClassName(`label-${layerObj.id}`)).length;

        if (zoom < minZoom || zoom > maxZoom) {
          this.removeLabels(`label-${layerObj.id}`);
        } else if (!isRendered) {
          this.addLabels(layerObj);
        }
      }
    });
  }

  render() {
    return (
        <div>
        {isIE || !mapboxgl.supported() ?
        (<div className="alert alert-info">
          Your browser is not supported. Please open link in another browser e.g Chrome or Firefox
        </div>) :
          (<div id='map' style={{ width: this.props.MAP.showFilterPanel ? 'calc(100% - 250px)' : '100%'}}/>)}
        </div>
    );
  }
}

export default connect(mapStateToProps)(Map);
