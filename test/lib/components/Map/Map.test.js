import React from 'react';
import { Map }  from '../../../../src/lib/components/Map/Map.js'
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';

//declare certain variables
const componentWrapper = shallow(
	//seems like JSX goes in here 
	<Map />
);

describe('Map', () => {
	it('Map component renders correctly', () => {
		const json = toJson(componentWrapper)
		expect(json).toMatchSnapshot();
	})
});